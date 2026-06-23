from sqlalchemy import func


def random_order():
    return func.random()


def date_trunc_expr(part: str, column):
    if part == "daily":
        return func.date(column)
    return func.date_trunc(part, column)
