'use strict'

import westfield from 'westfield-runtime-server'
import rtc from './protocol/rtc-browser-protocol'

export default class BrowserRtcPeerConnection extends westfield.Global {
  /**
   * @returns {BrowserRtcPeerConnection}
   */
  static create () {
    return new BrowserRtcPeerConnection()
  }

  constructor () {
    super(rtc.RtcPeerConnection.name, 1)
  }

  _createPeerConnecton (client, rtcPeerConnectionResource) {
    const peerConnection = new window.RTCPeerConnection()

    peerConnection.onicecandidate = (evt) => {
      if (evt.candidate !== null) {
        rtcPeerConnectionResource.serverIceCandidates(JSON.stringify({'candidate': evt.candidate}))
      }
    }

    rtcPeerConnectionResource.implementation.clientIceCandidates = (resource, description) => {
      const signal = JSON.parse(description)
      peerConnection.addIceCandidate(new window.RTCIceCandidate(signal.candidate)).catch(error => {
        this.onPeerConnectionError(client, error)
      })
    }

    rtcPeerConnectionResource.implementation.clientSdpReply = (resource, description) => {
      const signal = JSON.parse(description)
      peerConnection.setRemoteDescription(new window.RTCSessionDescription(signal.sdp)).catch((error) => {
        this.onPeerConnectionError(client, error)
      })
    }

    peerConnection.onnegotiationneeded = () => {
      peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
        voiceActivityDetection: false,
        iceRestart: false
      }).then((desc) => {
        return peerConnection.setLocalDescription(desc)
      }).then(() => {
        rtcPeerConnectionResource.serverSdpOffer(JSON.stringify({'sdp': peerConnection.localDescription}))
      }).catch((error) => {
        this.onPeerConnectionError(client, error)
      })
    }

    // store the peer connection in the implementation so we can find it again when we create a dc buffer later on.
    rtcPeerConnectionResource.implementation.peerConnection = peerConnection
  }

  bindClient (client, id, version) {
    const rtcPeerConnectionResource = new rtc.RtcPeerConnection(client, id, version)
    this._createPeerConnecton(client, rtcPeerConnectionResource)
  }

  // FIXME signal error to client & disconnect
  onPeerConnectionError (client, error) {}
}
