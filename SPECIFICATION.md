---

### File 2: `SPECIFICATION.md`
```markdown
# HTP Specification v1.0

## 1. Truth Acquisition Layer

### 1.1 Data Sources
Minimum 3 independent sources required for consensus:
- Primary exchanges (Coinbase, Kraken, Binance)
- Secondary aggregators (CoinGecko, CoinMarketCap)
- Direct feeds (where available)

### 1.2 Consensus Algorithm
```python
valid_readings = [r for r in readings if r.error is None]
if len(valid_readings) < ceil(len(sources) * 0.67):
    raise ConsensusFailure("Insufficient agreement")

median_price = median(r.price for r in valid_readings)
for r in valid_readings:
    if abs(r.price - median_price) / median_price > 0.001:
        raise ConsensusFailure("Price manipulation detected")
