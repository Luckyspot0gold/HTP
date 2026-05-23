"""
Audio synthesis engine for HTP
Generates WAV files from AudioParameters
"""
import numpy as np
from scipy.io.wavfile import write
import io


class AudioGenerator:
    """Generates audio from harmonic parameters."""
    
    SAMPLE_RATE = 44100
    
    def generate(self, params, duration: int = 30) -> np.ndarray:
        """
        Generate audio waveform from parameters.
        duration: seconds
        """
        samples = int(self.SAMPLE_RATE * duration)
        t = np.linspace(0, duration, samples)
        
        # Base carrier with modulation
        modulation = params.modulation_depth * np.sin(2 * np.pi * 0.5 * t)  # Slow sweep
        frequency = params.carrier_frequency + modulation
        
        # Generate carrier
        phase = 2 * np.pi * np.cumsum(frequency) / self.SAMPLE_RATE
        audio = np.sin(phase) * params.amplitude
        
        # Add harmonics based on complexity
        for i in range(2, params.harmonic_complexity + 2):
            harmonic_amp = params.amplitude / (i * 2)  # Decreasing amplitude
            audio += np.sin(phase * i) * harmonic_amp
        
        # Add rhythmic element based on tempo
        beat_interval = 60 / params.tempo_bpm
        beat_samples = int(self.SAMPLE_RATE * beat_interval)
        for i in range(0, samples, beat_samples):
            end = min(i + int(self.SAMPLE_RATE * 0.05), samples)
            audio[i:end] *= 1.3  # Accent beats
        
        # Normalize
        audio = audio / np.max(np.abs(audio)) * 0.8
        
        return audio
    
    def save(self, audio: np.ndarray, filename: str):
        """Save audio to WAV file."""
        audio_int16 = (audio * 32767).astype(np.int16)
        write(filename, self.SAMPLE_RATE, audio_int16)
