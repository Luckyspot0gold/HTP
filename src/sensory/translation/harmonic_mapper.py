"""
Layer 2: Harmonic Translation
Maps verified market state to audio parameters
"""
import numpy as np
from dataclasses import dataclass
from typing import Dict


@dataclass
class AudioParameters:
    carrier_frequency: float      # Hz (200-800)
    modulation_depth: float       # Hz (0-50)
    amplitude: float              # 0.0-1.0
    tempo_bpm: float             # 60-180
    harmonic_complexity: int      # 1-5 overtones
    trend_direction: str         # 'up', 'down', 'neutral'


class HarmonicMapper:
    """
    Maps market variables to psychoacoustic parameters.
    Based on W.J. Design Specification principles.
    """
    
    BASE_FREQUENCY = 432.0  # Hz, adjustable
    
    def __init__(self, base_freq: float = None):
        self.base_freq = base_freq or self.BASE_FREQUENCY
    
    def map_market_state(self, truth_certificate, history: list = None) -> AudioParameters:
        """
        Convert verified market truth to audio parameters.
        
        truth_certificate: TruthCertificate from Layer 1
        history: List of previous certificates for trend calculation
        """
        price = truth_certificate.verified_price
        volume = truth_certificate.verified_volume
        
        # Calculate derived metrics
        volatility = self._calculate_volatility(history) if history else 0.05
        momentum = self._calculate_momentum(history) if history else 0
        trend = self._determine_trend(history) if history else 'neutral'
        
        # Map to audio
        return AudioParameters(
            carrier_frequency=self._price_to_frequency(price),
            modulation_depth=self._volatility_to_modulation(volatility),
            amplitude=self._volume_to_amplitude(volume),
            tempo_bpm=self._momentum_to_tempo(momentum),
            harmonic_complexity=self._trend_to_complexity(trend),
            trend_direction=trend
        )
    
    def _price_to_frequency(self, price: float) -> float:
        """
        Map price level to carrier frequency.
        Logarithmic scale: higher price = higher pitch
        """
        # Normalize to 200-800 Hz range
        # Using log scale because prices vary wildly (BTC $40K vs SHIB $0.00001)
        log_price = np.log10(max(price, 0.000001))
        
        # Map log price to frequency
        # BTC ~$40K → ~600 Hz
        # ETH ~$2K → ~500 Hz
        min_freq, max_freq = 200, 800
        normalized = (log_price - 3) / 6  # Rough normalization
        freq = min_freq + normalized * (max_freq - min_freq)
        
        return round(max(min_freq, min(max_freq, freq)), 2)
    
    def _volatility_to_modulation(self, volatility: float) -> float:
        """
        Map volatility to frequency modulation depth.
        Higher volatility = more wavering pitch
        """
        # Clamp volatility to reasonable range (0-0.5)
        clamped = max(0, min(volatility, 0.5))
        # Map to 0-50 Hz modulation
        return round(clamped * 100, 2)
    
    def _volume_to_amplitude(self, volume: float) -> float:
        """
        Map trading volume to amplitude.
        Higher volume = louder
        """
        # Normalize volume (assume max reasonable daily volume)
        max_volume = 100_000_000_000  # $100B daily
        normalized = min(volume / max_volume, 1.0)
        
        # Map to 0.1-1.0 range (never fully silent)
        return round(0.1 + normalized * 0.9, 3)
    
    def _momentum_to_tempo(self, momentum: float) -> float:
        """
        Map price momentum to tempo (BPM).
        Higher momentum = faster rhythm
        """
        # Momentum: -1.0 to +1.0 (price change %)
        # Map to 60-180 BPM
        normalized = (momentum + 1) / 2  # 0 to 1
        bpm = 60 + normalized * 120
        return round(max(60, min(180, bpm)), 1)
    
    def _trend_to_complexity(self, trend: str) -> int:
        """
        Map trend to harmonic complexity (number of overtones).
        Strong trends = simpler (pure tone)
        Choppy/uncertain = more complex (rich timbre)
        """
        if trend == 'strong_up' or trend == 'strong_down':
            return 1  # Pure tone, clear direction
        elif trend in ['up', 'down']:
            return 3  # Some complexity
        else:
            return 5  # Rich, uncertain
    
    def _calculate_volatility(self, history: list) -> float:
        """Calculate price volatility from history."""
        if len(history) < 2:
            return 0.05
        
        prices = [h.verified_price for h in history]
        returns = [(prices[i] - prices[i-1]) / prices[i-1] 
                   for i in range(1, len(prices))]
        
        return np.std(returns) if returns else 0.05
    
    def _calculate_momentum(self, history: list) -> float:
        """Calculate price momentum (-1 to 1)."""
        if len(history) < 2:
            return 0
        
        recent = history[-1].verified_price
        previous = history[-5].verified_price if len(history) >= 5 else history[0].verified_price
        
        change = (recent - previous) / previous
        # Clamp to -1 to 1 range (represents -100% to +100%)
        return max(-1.0, min(1.0, change))
    
    def _determine_trend(self, history: list) -> str:
        """Determine trend direction from history."""
        if len(history) < 3:
            return 'neutral'
        
        momentum = self._calculate_momentum(history)
        
        if momentum > 0.05:
            return 'strong_up' if momentum > 0.1 else 'up'
        elif momentum < -0.05:
            return 'strong_down' if momentum < -0.1 else 'down'
        else:
            return 'neutral'
