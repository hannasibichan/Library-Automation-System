import datetime

def calculate_gradual_fine(return_date):
    """
    Calculates a fine with a fixed base fee plus a daily increment.
    - Base Fine: ₹100
    - Daily Increment: ₹5/day after return date
    """
    if not return_date:
        return 0.00
    
    # Ensure return_date is a datetime object
    if isinstance(return_date, str):
        try:
            # Handle potential 'Z' in some formats
            if return_date.endswith('Z'):
                return_date = return_date[:-1]
            return_date = datetime.datetime.fromisoformat(return_date)
        except ValueError:
            return 0.00

    now = datetime.datetime.now()
    if now <= return_date:
        return 0.00
        
    days_overdue = (now - return_date).days
    
    # If it is same day but later time, (now - return_date).days might be 0.
    # We should calculate as (seconds // (24*3600)) or just handle 0 accurately.
    # Typically, part of a day counts as 1 day late.
    
    # To be precise on days:
    if days_overdue <= 0 and now > return_date:
        days_overdue = 1
    elif days_overdue <= 0:
        return 0.00

    # Fixed base fine 100 + 5 per day after return date
    total_fine = 100.00 + (5.00 * days_overdue)
            
    return round(total_fine, 2)
