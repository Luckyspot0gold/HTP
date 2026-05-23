---

### File 3: `protocol/consensus/truth_engine.py`
```python
"""
Layer 1: Truth Acquisition
The foundation of HTP - verified, immutable market data
"""
import hashlib
import json
import time
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
import requests


@dataclass
class SourceReading:
    name: str
    price: float
    volume: float
    timestamp: float
    latency_ms: int
    signature: Optional[str] = None  # Source's cryptographic proof


@dataclass  
class TruthCertificate:
    timestamp: str
    consensus_hash: str
    sources: List[SourceReading]
    confidence: float
    verified_price: float
    verified_volume: float


class ConsensusFailure(Exception):
    pass


class TruthEngine:
    """
    Multi-source consensus engine for market data verification.
    Comparable to GPS triangulation or blockchain consensus.
    """
    
    CONSENSUS_THRESHOLD = 0.67  # 2/3 majority required
    PRICE_TOLERANCE = 0.001     # 0.1% max deviation
    
    def __init__(self, sources: List[Dict]):
        """
        sources: [
            {'name': 'coinbase', 'url': 'https://api.coinbase.com/v2/exchange-rates', 'weight': 1.0},
            {'name': 'kraken', 'url': 'https://api.kraken.com/0/public/Ticker', 'weight': 1.0}
        ]
        """
        self.sources = sources
        self.min_sources = max(2, int(len(sources) * self.CONSENSUS_THRESHOLD))
    
    def acquire_truth(self, asset: str) -> TruthCertificate:
        """
        Fetch from all sources, verify consensus, return immutable certificate.
        Raises ConsensusFailure if sources disagree or insufficient data.
        """
        readings = self._fetch_from_all_sources(asset)
        valid_readings = self._filter_valid(readings)
        
        if len(valid_readings) < self.min_sources:
            raise ConsensusFailure(
                f"Insufficient sources: {len(valid_readings)}/{len(self.sources)} "
                f"(need {self.min_sources})"
            )
        
        consensus = self._calculate_consensus(valid_readings)
        
        return TruthCertificate(
            timestamp=datetime.utcnow().isoformat() + 'Z',
            consensus_hash=self._merkle_root(valid_readings),
            sources=valid_readings,
            confidence=consensus['confidence'],
            verified_price=consensus['price'],
            verified_volume=consensus['volume']
        )
    
    def _fetch_from_all_sources(self, asset: str) -> List[SourceReading]:
        """Fetch from all configured sources in parallel."""
        readings = []
        for source in self.sources:
            try:
                start = time.time()
                data = self._fetch_source(source, asset)
                latency_ms = int((time.time() - start) * 1000)
                
                readings.append(SourceReading(
                    name=source['name'],
                    price=data['price'],
                    volume=data.get('volume', 0),
                    timestamp=data['timestamp'],
                    latency_ms=latency_ms,
                    signature=data.get('signature')  # If source provides
                ))
            except Exception as e:
                readings.append(SourceReading(
                    name=source['name'],
                    price=0,
                    volume=0,
                    timestamp=0,
                    latency_ms=0
                ))
                print(f"Source {source['name']} failed: {e}")
        
        return readings
    
    def _fetch_source(self, source: Dict, asset: str) -> Dict:
        """Fetch from a single source. Override for different APIs."""
        # Generic implementation - override per source type
        if source['name'] == 'coinbase':
            return self._fetch_coinbase(source['url'], asset)
        elif source['name'] == 'kraken':
            return self._fetch_kraken(source['url'], asset)
        else:
            raise ValueError(f"Unknown source: {source['name']}")
    
    def _fetch_coinbase(self, url: str, asset: str) -> Dict:
        """Coinbase API implementation."""
        response = requests.get(f"{url}?currency=USD", timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Coinbase returns rates relative to USD
        rate = float(data['data']['rates'][asset.upper()])
        price = 1 / rate if rate > 0 else 0
        
        return {
            'price': price,
            'volume': 0,  # Would need separate API call
            'timestamp': time.time()
        }
    
    def _fetch_kraken(self, url: str, asset: str) -> Dict:
        """Kraken API implementation."""
        pair = f"{asset.upper()}USD"
        response = requests.get(f"{url}?pair={pair}", timeout=5)
        response.raise_for_status()
        data = response.json()
        
        result = data['result'][pair]
        
        return {
            'price': float(result['c'][0]),  # Last trade closed
            'volume': float(result['v'][1]),  # 24h volume
            'timestamp': time.time()
        }
    
    def _filter_valid(self, readings: List[SourceReading]) -> List[SourceReading]:
        """Filter out failed readings."""
        return [r for r in readings if r.price > 0 and r.timestamp > 0]
    
    def _calculate_consensus(self, readings: List[SourceReading]) -> Dict:
        """Calculate median price and verify agreement."""
        prices = sorted([r.price for r in readings])
        volumes = [r.volume for r in readings]
        
        median_price = prices[len(prices) // 2]
        median_volume = sorted(volumes)[len(volumes) // 2] if volumes else 0
        
        # Verify all prices are within tolerance
        for r in readings:
            deviation = abs(r.price - median_price) / median_price
            if deviation > self.PRICE_TOLERANCE:
                raise ConsensusFailure(
                    f"Source {r.name} deviates {deviation:.2%} from median "
                    f"({r.price} vs {median_price})"
                )
        
        # Calculate confidence based on source agreement
        # Higher confidence = more sources, lower deviation
        avg_deviation = sum(
            abs(r.price - median_price) / median_price 
            for r in readings
        ) / len(readings)
        
        confidence = (len(readings) / len(self.sources)) * (1 - avg_deviation * 100)
        confidence = max(0.0, min(1.0, confidence))
        
        return {
            'price': median_price,
            'volume': median_volume,
            'confidence': round(confidence, 4)
        }
    
    def _merkle_root(self, readings: List[SourceReading]) -> str:
        """Calculate Merkle root of source readings for immutability."""
        hashes = []
        for r in readings:
            data = f"{r.name}:{r.price}:{r.volume}:{r.timestamp}"
            hashes.append(hashlib.sha256(data.encode()).hexdigest())
        
        # Pairwise hashing until one remains
        while len(hashes) > 1:
            next_level = []
            for i in range(0, len(hashes), 2):
                if i + 1 < len(hashes):
                    combined = hashes[i] + hashes[i + 1]
                else:
                    combined = hashes[i] + hashes[i]  # Odd node duplicated
                next_level.append(hashlib.sha256(combined.encode()).hexdigest())
            hashes = next_level
        
        return hashes[0] if hashes else ""
    
    def verify_certificate(self, certificate: TruthCertificate) -> bool:
        """Verify a certificate's integrity (anyone can check)."""
        # Re-calculate merkle root
        calculated_hash = self._merkle_root(certificate.sources)
        return calculated_hash == certificate.consensus_hash
