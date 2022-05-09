class Business {
  constructor({ room, media, view, socketBuilder, peerBuilder }) {
    this.room = room
    this.media = media
    this.view = view

    this.socketBuilder = socketBuilder
    this.peerBuilder = peerBuilder

    this.socket = {}
    this.currentStream = {}
    this.currentPeer = {}

    this.peers = new Map()
  }

  static initialize(deps) {
    const instance = new Business(deps)
    return instance._init()
  }

  async _init() {
    this.currentStream = await this.media.getCamera()

    this.socket = this.socketBuilder
      .setOnUserConnected(this.onUserConnected())
      .setOnUserDisconnected(this.onUserDisconnected())
      .build()

    this.currentPeer = await this.peerBuilder
      .setOnError(this.onPeerError())
      .setOnConnectionOpened(this.onPeerConnectionOpened())
      .setOnCallReceived(this.onPeerCallReceived())
      .setOnPeerStreamReceived(this.onPeerStreamReceived())
      .setOnCallError(this.onPeerCallError())
      .setOnCallClose(this.onPeerCallClose())
      .build()

    this.addVideoStream(this.currentPeer.id)
  }

  addVideoStream(userId, stream = this.currentStream) {
    const isCurrentId = false
    this.view.renderVideo({
      userId,
      stream,
      isCurrentId
    })
  }

  onUserConnected = function () {
    return userId => {
      console.log('user connected!', userId)
      this.currentPeer.call(userId, this.currentStream)
    }
  }

  onUserDisconnected = function () {
    return userId => {
      console.log('user disconnected!', userId)

      if (this.peers.has(userId)) {
        this.peers.get(userId).call.close()
        this.peers.delete(userId)
      }

      this.view.setParticipants(this.peers.size)
      this.view.removeVideoElement(userId)
    }
  }

  // clojure, uma função que retorna outra função
  onPeerError = function () {
    return error => {
      console.error('error on peer!', error)
    }
  }

  onPeerConnectionOpened = function () {
    return peer => {
      const id = peer.id
      console.log("peer!!!", peer)
      this.socket.emit('join-room', this.room, id)
    }
  }

  onPeerCallReceived = function () {
    return call => {
      console.log('answering call', call)
      call.answer(this.currentStream)
    }
  }

  onPeerStreamReceived = function () {
    return (call, stream) => {
      const callerId = call.peer
      this.addVideoStream(callerId, stream)
      this.peers.set(callerId, { call })

      this.view.setParticipants(this.peers.size)
    }
  }

  onPeerCallError = function () {
    return (call, error) => {
      console.log('an call error ocurred!', error)
      this.view.removeVideoElement(call.peer)
    }
  }

  onPeerCallClose = function () {
    return (call) => {
      console.log('call closed!!', call)
    }
  }
}
