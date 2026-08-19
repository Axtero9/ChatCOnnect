/**
 * WebRTC Helper and RTCPeerConnection Manager
 * Uses Google Public STUN server: stun:stun.l.google.com:19302
 */

export const ICE_SERVERS = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ]
    }
  ]
};

export class WebRTCManager {
  constructor({ socket, roomId, onRemoteStream, onConnectionStateChange }) {
    this.socket = socket;
    this.roomId = roomId;
    this.onRemoteStream = onRemoteStream;
    this.onConnectionStateChange = onConnectionStateChange;
    this.peerConnection = null;
    this.localStream = null;
    this.iceCandidateQueue = [];
  }

  /**
   * Initializes the RTCPeerConnection and attaches local tracks
   */
  createPeerConnection(localStream) {
    this.localStream = localStream;
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Remote track received
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote stream track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        if (this.onRemoteStream) {
          this.onRemoteStream(event.streams[0]);
        }
      }
    };

    // ICE Candidate discovered
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          roomId: this.roomId,
          candidate: event.candidate
        });
      }
    };

    // State changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };

    return this.peerConnection;
  }

  /**
   * Initiator creates and sends WebRTC Offer
   */
  async createOffer() {
    if (!this.peerConnection) return;
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit('webrtc-offer', {
        roomId: this.roomId,
        offer
      });
      console.log('[WebRTC] Offer created and emitted.');
    } catch (err) {
      console.error('[WebRTC] Error creating offer:', err);
    }
  }

  /**
   * Receiver handles WebRTC Offer and returns Answer
   */
  async handleOffer(offer) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Process queued candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('webrtc-answer', {
        roomId: this.roomId,
        answer
      });
      console.log('[WebRTC] Answer created and emitted.');
    } catch (err) {
      console.error('[WebRTC] Error handling offer:', err);
    }
  }

  /**
   * Initiator handles WebRTC Answer
   */
  async handleAnswer(answer) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Process queued candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
      console.log('[WebRTC] Answer set as remote description.');
    } catch (err) {
      console.error('[WebRTC] Error handling answer:', err);
    }
  }

  /**
   * Adds an ICE candidate received from the peer
   */
  async addIceCandidate(candidate) {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      // Queue until remote description is set
      this.iceCandidateQueue.push(candidate);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[WebRTC] Error adding ICE candidate:', err);
    }
  }

  /**
   * Closes and cleans up the connection
   */
  cleanup() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.iceCandidateQueue = [];
    console.log('[WebRTC] Connection cleaned up.');
  }
}
