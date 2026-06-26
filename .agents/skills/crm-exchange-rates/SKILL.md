---
name: crm-exchange-rates
description: "Exchange rate management - fetch, cache, and apply exchange rates for multi-currency transactions"
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [CRM, Exchange Rates, Currency]
depends_on: [crm-auth]
---

# CRM Exchange Rates Skill

Manage exchange rates for multi-currency transactions. The CRM caches exchange rates from external sources.

## Collections

| Collection | Description |
|-----------|-------------|
| `exchange_rate_cache` | Cached exchange rates |
| `exchange_rate_history` | Historical rate data |

## Common Operations

### Get Current Rate
```python
from crm_auth import pb_list
rates = pb_list("exchange_rate_cache", 
    "filter=(base_currency='USD'&&target_currency='CNY')")
rate = rates.get("items", [{}])[0]
print(f"USD/CNY: {rate.get('rate')} (updated: {rate.get('fetched_at')})")
```

### Refresh Rates
```python
url = f"{CRM_API_URL}/api/exchange-rates/refresh"
req = urllib.request.Request(url, headers=get_pb_headers(), method="POST")
with urllib.request.urlopen(req) as r:
    result = json.loads(r.read())
```

### Convert Currency
```python
rate_data = pb_list("exchange_rate_cache",
    f"filter=(base_currency='USD'&&target_currency='EUR')")
rate = float(rate_data.get("items", [{}])[0].get("rate", 0))
usd_amount = 10000.00
eur_amount = usd_amount * rate
print(f"$10,000.00 USD = €{eur_amount:.2f} EUR")
```

## Rate Sources

- External API (configurable)
- Manual override in CRM
- Historical records for reporting
