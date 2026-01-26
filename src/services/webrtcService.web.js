class WebRTCServiceWeb {
  async initializeAudio() {
    throw new Error('Voice calls are only available on mobile devices');
  }

  async createPeerConnection() {
    throw new Error('Voice calls are only available on mobile devices');
  }

  async createOffer() {
    throw new Error('Voice calls are only available on mobile devices');
  }

  async createAnswer() {
    throw new Error('Voice calls are only available on mobile devices');
  }

  async handleAnswer() {
    throw new Error('Voice calls are only available on mobile devices');
  }

  async addIceCandidate() {
    return;
  }

  toggleMute() {
    return false;
  }

  async toggleSpeaker() {
    return false;
  }

  closeConnection() {
    return;
  }
}

export default new WebRTCServiceWeb();
