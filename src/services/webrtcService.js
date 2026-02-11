// WebRTC Service for audio call management
import { Platform } from 'react-native';

// WebRTC configuration
const peerConnectionConfig = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ],
};

// Initialize WebRTC module on native platforms
let RTCPeerConnection;
let RTCIceCandidate;
let RTCSessionDescription;
let mediaDevices;

if (Platform.OS !== 'web') {
  try {
    const webrtcModule = require('react-native-webrtc');
    RTCPeerConnection = webrtcModule.RTCPeerConnection;
    RTCIceCandidate = webrtcModule.RTCIceCandidate;
    RTCSessionDescription = webrtcModule.RTCSessionDescription;
    mediaDevices = webrtcModule.mediaDevices;

    // Register WebRTC globals on native platforms only
    webrtcModule.registerGlobals();
  } catch (error) {
    console.warn('[WEBRTC] Failed to load native WebRTC module:', error);
  }
}

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = true;
    this.iceCandidatesQueue = [];
  }

  // Initialize WebRTC and get local audio stream
  async initializeAudio() {
    try {
      console.log('[WEBRTC] Initializing audio...');

      // On web, audio is not supported
      if (Platform.OS === 'web') {
        throw new Error('Voice calls are only available on mobile devices');
      }

      if (!mediaDevices) {
        throw new Error('WebRTC is not available on this platform');
      }

      // Stop existing stream if any
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Get media constraints for audio only
      const mediaConstraints = {
        audio: true,
        video: false,
      };

      // Get local media stream
      const stream = await mediaDevices.getUserMedia(mediaConstraints);
      this.localStream = stream;

      console.log('[WEBRTC] Local audio stream obtained');
      console.log('[WEBRTC] Audio tracks:', stream.getAudioTracks().length);

      return stream;
    } catch (error) {
      console.error('[WEBRTC] Error initializing audio:', error);
      throw error;
    }
  }

  // Create RTCPeerConnection
  async createPeerConnection(onRemoteStreamReady, onIceCandidate) {
    try {
      console.log('[WEBRTC] Creating peer connection...');

      if (Platform.OS === 'web') {
        throw new Error('Voice calls are only available on mobile devices');
      }

      if (!RTCPeerConnection) {
        throw new Error('RTCPeerConnection is not available on this platform');
      }

      this.peerConnection = new RTCPeerConnection(peerConnectionConfig);

      // Add local stream tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          console.log('[WEBRTC] Adding track:', track.kind);
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WEBRTC] ICE candidate:', event.candidate.candidate);
          if (onIceCandidate) {
            onIceCandidate(event.candidate);
          }
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('[WEBRTC] Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          console.log('[WEBRTC] Remote stream ready');
          if (onRemoteStreamReady) {
            onRemoteStreamReady(this.remoteStream);
          }
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('[WEBRTC] Connection state:', this.peerConnection.connectionState);
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[WEBRTC] ICE connection state:', this.peerConnection.iceConnectionState);
      };

      console.log('[WEBRTC] Peer connection created');
      return this.peerConnection;
    } catch (error) {
      console.error('[WEBRTC] Error creating peer connection:', error);
      throw error;
    }
  }

  // Create and send offer
  async createOffer() {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      console.log('[WEBRTC] Creating offer...');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log('[WEBRTC] Offer created and local description set');

      return offer;
    } catch (error) {
      console.error('[WEBRTC] Error creating offer:', error);
      throw error;
    }
  }

  async processQueuedIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    console.log(`[WEBRTC] Processing ${this.iceCandidatesQueue.length} queued ICE candidates`);
    while (this.iceCandidatesQueue.length > 0) {
      const candidate = this.iceCandidatesQueue.shift();
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[WEBRTC] Error adding queued ICE candidate:', error);
      }
    }
  }

  // Create and send answer
  async createAnswer(offer) {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      console.log('[WEBRTC] Creating answer...');
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      // Process any ICE candidates that arrived before the offer
      await this.processQueuedIceCandidates();

      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.peerConnection.setLocalDescription(answer);
      console.log('[WEBRTC] Answer created and local description set');

      return answer;
    } catch (error) {
      console.error('[WEBRTC] Error creating answer:', error);
      throw error;
    }
  }

  // Handle incoming answer
  async handleAnswer(answer) {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      console.log('[WEBRTC] Handling answer...');
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      // Process any ICE candidates that arrived before the answer
      await this.processQueuedIceCandidates();

      console.log('[WEBRTC] Remote description set');
    } catch (error) {
      console.error('[WEBRTC] Error handling answer:', error);
      throw error;
    }
  }

  // Add ICE candidate
  async addIceCandidate(candidate) {
    try {
      if (!this.peerConnection) {
        throw new Error('Peer connection not initialized');
      }

      if (candidate) {
        if (this.peerConnection.remoteDescription) {
          console.log('[WEBRTC] Adding ICE candidate');
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } else {
          console.log('[WEBRTC] Remote description not set, queuing ICE candidate');
          this.iceCandidatesQueue.push(candidate);
        }
      }
    } catch (error) {
      console.error('[WEBRTC] Error adding ICE candidate:', error);
    }
  }

  // Toggle mute
  toggleMute() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = this.isMuted; // Toggle enabled state
      });
      this.isMuted = !this.isMuted;
      console.log('[WEBRTC] Mute toggled:', this.isMuted ? 'ON' : 'OFF');
      return this.isMuted;
    }
    return false;
  }

  // Toggle speaker
  async toggleSpeaker() {
    try {
      this.isSpeakerOn = !this.isSpeakerOn;
      console.log('[WEBRTC] Speaker toggled:', this.isSpeakerOn ? 'ON' : 'OFF');

      // This would require platform-specific code to actually change audio routing
      // For now, we just track the state
      return this.isSpeakerOn;
    } catch (error) {
      console.error('[WEBRTC] Error toggling speaker:', error);
      throw error;
    }
  }

  // Get mute status
  isMuted() {
    return this.isMuted;
  }

  // Get speaker status
  isSpeakerOn() {
    return this.isSpeakerOn;
  }

  // Close connection
  closeConnection() {
    try {
      console.log('[WEBRTC] Closing connection...');

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          track.stop();
        });
        this.localStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      this.remoteStream = null;
      this.isMuted = false;
      this.iceCandidatesQueue = [];

      console.log('[WEBRTC] Connection closed');
    } catch (error) {
      console.error('[WEBRTC] Error closing connection:', error);
    }
  }

  // Check connection state
  getConnectionState() {
    if (this.peerConnection) {
      return this.peerConnection.connectionState;
    }
    return null;
  }

  // Check ICE connection state
  getIceConnectionState() {
    if (this.peerConnection) {
      return this.peerConnection.iceConnectionState;
    }
    return null;
  }
}

// Export singleton instance
export default new WebRTCService();
