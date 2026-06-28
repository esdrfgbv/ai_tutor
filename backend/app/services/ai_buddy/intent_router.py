import json
import asyncio
from typing import AsyncGenerator
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.models.models import User
from app.services.ai_buddy.context import get_student_context, build_system_prompt
from app.services.ai_buddy.conversation import MemoryManager
from app.services.ai_buddy.tool_registry import registry

class IntentRouter:
    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.settings = get_settings()
        self.memory = MemoryManager(db, user.id)
        
        # AsyncOpenAI for Groq streaming
        self.client = AsyncOpenAI(
            api_key=self.settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        self.model = self.settings.groq_model or "llama-3.1-8b-instant"

    async def stream_response(self, user_message: str, page_payload: dict = None) -> AsyncGenerator[str, None]:
        # 1. Build context
        context = get_student_context(self.db, self.user, page_payload)
        system_prompt = build_system_prompt(context)

        # 2. Prepare messages
        messages = [{"role": "system", "content": system_prompt}]
        history = self.memory.get_history(limit=5)
        messages.extend(history)
        
        # Add current message
        messages.append({"role": "user", "content": user_message})
        
        # We need to save the user message to memory now, asynchronously (but memory is sync currently)
        # Assuming db is a standard sync session for now. If it blocks slightly, it's ok for this iteration.
        self.memory.add_message("user", user_message)

        # 3. Get tools
        tools = registry.get_all_tools_for_llm()

        # 4. First API Call (to check for tool calls)
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            max_tokens=1024,
            temperature=0.3,
            stream=False # We first do a non-streaming call to easily intercept tool calls
        )

        message = response.choices[0].message
        
        # 5. Check if LLM decided to call a tool
        if message.tool_calls:
            # We are calling one or multiple tools
            tool_results = []
            
            for tool_call in message.tool_calls:
                func_name = tool_call.function.name
                arguments = json.loads(tool_call.function.arguments)
                
                # Execute tool
                result = await registry.execute_tool(func_name, arguments, self.db, self.user)
                
                # We yield a special JSON object to the frontend so it knows an action occurred
                # The frontend can interpret action chunks
                action_chunk = json.dumps({
                    "type": "tool_call",
                    "tool": func_name,
                    "result": result
                })
                yield f"data: {action_chunk}\n\n"
                
                tool_results.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": func_name,
                    "content": json.dumps(result)
                })
            
            # Now, stream the follow up response to the user
            messages.append(message)
            messages.extend(tool_results)
            
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1024,
                temperature=0.3,
                stream=True
            )
            
            full_response = ""
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield f"data: {json.dumps({'type': 'text', 'content': content})}\n\n"
            
            self.memory.add_message("assistant", full_response)
        
        else:
            # No tool call, just stream the response directly
            # We could have just streamed the first call, but for simplicity we re-call with stream=True
            # or just return the static text if it's already generated. Let's just return the static text 
            # and stream it chunk by chunk to simulate streaming since we already generated it.
            # Actually, to get real streaming we should do the first call as stream.
            # But function calling with stream=True in OpenAI is complex to parse manually.
            # We will stream the static text slowly for this prototype, OR just yield the whole thing.
            
            content = message.content or ""
            # Yield full text as a single text chunk
            yield f"data: {json.dumps({'type': 'text', 'content': content})}\n\n"
            self.memory.add_message("assistant", content)
