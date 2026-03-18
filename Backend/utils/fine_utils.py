import datetime

def calculate_gradual_fine(return_date):
    """
    Calculates a tiered fine based on how many days the book is overdue.
    - Tier 1 (1-7 days): ₹2/day
    - Tier 2 (8-14 days): ₹5/day
    - Tier 3 (15+ days): ₹10/day
    """
    if not return_date:
        return 0.00
    
    # Ensure return_date is a datetime object
    if isinstance(return_date, str):
        try:
            return_date = datetime.datetime.fromisoformat(return_date)
        except ValueError:
            return 0.00

    now = datetime.datetime.now()
    if now <= return_date:
        return 0.00
        
    days_overdue = (now - return_date).days
    if days_overdue <= 0:
        return 0.00
        
    total_fine = 0.00
    
    # Calculate fine based on tiers
    for day in range(1, days_overdue + 1):
        if day <= 7:
            total_fine += 2.00
        elif day <= 14:
            total_fine += 5.00
        else:
            total_fine += 10.00
            
    return round(total_fine, 2)
