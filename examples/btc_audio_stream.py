#!/usr/bin/env python3
"""
HTP Example: Bitcoin Audio Stream
The minimal demonstration of the entire protocol stack.
"""
import time
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from protocol.consensus.truth_engine import TruthEngine, ConsensusFailure
from sensory.audio.harmonic_mapper import HarmonicMapper
from sensory.audio.generator import AudioGenerator  # We'll create this


def main():
    print("=" * 60)
    print("HARMONIC TRUTH PROTOCOL")
    print("Bitcoin Audio Stream Demo")
    print("=" * 60)
    print()
    
    # Layer 1: Truth Acquisition
    print("[Layer 1] Acquiring verified market data...")
    
    sources = [
        {'name': 'coinbase', 'url': 'https://api.coinbase.com/v2/exchange-rates', 'weight': 1.0},
        {'name': 'kraken', 'url': 'https://api.kraken.com/0/public/Ticker', 'weight': 1.0},
    ]
    
    engine = TruthEngine(sources)
    
    try:
        truth = engine.acquire_truth('BTC')
        print(f"✓ Consensus achieved")
        print(f"  Price: ${truth.verified_price:,.2f}")
        print(f"  Confidence: {truth.confidence:.2%}")
        print(f"  Sources: {len([s for s in truth.sources if s.price > 0])}/{len(sources)}")
        print(f"  Hash: {truth.consensus_hash[:16]}...")
        print()
    except ConsensusFailure as e:
        print(f"✗ Consensus failed: {e}")
        return
    
    # Layer 2: Harmonic Translation
    print("[Layer 2] Translating to audio parameters...")
    
    mapper = HarmonicMapper()
    params = mapper.map_market_state(truth)
    
    print(f"  Carrier: {params.carrier_frequency} Hz")
    print(f"  Modulation: ±{params.modulation_depth} Hz")
    print(f"  Amplitude: {params.amplitude}")
    print(f"  Tempo: {params.tempo_bpm} BPM")
    print(f"  Complexity: {params.harmonic_complexity} overtones")
    print(f"  Trend: {params.trend_direction}")
    print()
    
    # Layer 3: Audio Generation
    print("[Layer 3] Generating audio...")
    
    generator = AudioGenerator()
    audio = generator.generate(params, duration=30)
    
    # Save to file
    output_file = "btc_market_state.wav"
    generator.save(audio, output_file)
    
    print(f"✓ Audio saved to: {output_file}")
    print()
    print("Play this file to hear the verified Bitcoin market state.")
    print("The sound you hear is cryptographically tied to real market data.")
    print()
    print("Every time you run this script, you get:")
    print("  - Fresh market data from multiple sources")
    print("  - Consensus verification")
    print("  - Immutable audit trail")
    print("  - Human-perceivable harmonic representation")
    print()
    print("This is the Harmonic Truth Protocol.")


if __name__ == "__main__":
    main()
