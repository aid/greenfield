// Copyright 2019 Erik De Rijcke
//
// This file is part of Greenfield.
//
// Greenfield is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Greenfield is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with Greenfield.  If not, see <https://www.gnu.org/licenses/>.

'use strict'

import RenderState from './RenderState'
import Texture from './Texture'
import Size from '../Size'

import VideoConverter, { setLogger } from 'h264-converter'

// setLogger(console.log)

class Mp4RenderState extends RenderState {
  /**
   * @param {WebGLRenderingContext}gl
   * @param {String}mime
   * @return {Promise<Mp4RenderState>}
   */
  static async create (gl, mime) {
    // TODO check for media source support first
    const opaqueVideoElement = document.createElement('video')
    const alphaVideoElement = document.createElement('video')

    // document.body.prepend(alphaVideoElement)
    // document.body.prepend(opaqueVideoElement)

    opaqueVideoElement.autoplay = true
    alphaVideoElement.autoplay = true

    opaqueVideoElement.addEventListener('error', e => {
      console.log('opaque video error ' + e)
    })
    alphaVideoElement.addEventListener('error', e => {
      console.log('alpha video error ' + e)
    })

    // const opaqueMediaSource = new window.MediaSource()
    // const alphaMediaSource = new window.MediaSource()
    //
    // if (!window.MediaSource.isTypeSupported(mime)) {
    //   throw new Error(`Video type not supported: ${mime}`)
    // }
    //
    // opaqueVideoElement.src = URL.createObjectURL(opaqueMediaSource)
    // alphaVideoElement.src = URL.createObjectURL(alphaMediaSource)

    // const [opaqueSourceBuffer, alphaSourceBuffer] = await Promise.all([
    //   new Promise(resolve => {
    //     opaqueMediaSource.onsourceopen = () => {
    //       URL.revokeObjectURL(opaqueVideoElement.src)
    //       opaqueMediaSource.clearLiveSeekableRange()
    //       const opaqueSourceBuffer = opaqueMediaSource.addSourceBuffer(mime)
    //       opaqueMediaSource.onsourceopen = null
    //       resolve(opaqueSourceBuffer)
    //     }
    //
    //     opaqueMediaSource.addEventListener('error', (e) => {
    //       console.log('opaque media source error ' + e)
    //     })
    //   }),
    //   new Promise(resolve => {
    //     alphaMediaSource.onsourceopen = () => {
    //       URL.revokeObjectURL(alphaVideoElement.src)
    //       alphaMediaSource.clearLiveSeekableRange()
    //       const alphaSourceBuffer = alphaMediaSource.addSourceBuffer(mime)
    //       alphaMediaSource.onsourceopen = null
    //       resolve(alphaSourceBuffer)
    //     }
    //
    //     alphaMediaSource.addEventListener('error', (e) => {
    //       console.log('opaque media source error ' + e)
    //     })
    //   })
    // ])

    // opaqueSourceBuffer.mode = 'sequence'
    // alphaSourceBuffer.mode = 'sequence'

    return new Mp4RenderState(gl, opaqueVideoElement, alphaVideoElement)
  }

  /**
   * @param {WebGLRenderingContext}gl
   * @param {HTMLVideoElement}opaqueVideoElement
   * @param {HTMLVideoElement}alphaVideoElement
   * @param {SourceBuffer}opaqueSourceBuffer
   * @param {SourceBuffer}alphaSourceBuffer
   */
  constructor (gl, opaqueVideoElement, alphaVideoElement, opaqueSourceBuffer, alphaSourceBuffer) {
    super()
    this.gl = gl
    /**
     * @type {!Texture}
     */
    this.opaqueTexture = Texture.create(this.gl, this.gl.RGBA)
    /**
     * @type {!Texture}
     */
    this.alphaTexture = Texture.create(this.gl, this.gl.RGBA)
    /**
     * @type {HTMLVideoElement}
     */
    this.opaqueVideoElement = opaqueVideoElement
    /**
     * @type {HTMLVideoElement}
     */
    this.alphaVideoElement = alphaVideoElement
    /**
     * @type {SourceBuffer}
     * @private
     */
    this._opaqueSourceBuffer = opaqueSourceBuffer
    /**
     * @type {SourceBuffer}
     * @private
     */
    this._alphaSourceBuffer = alphaSourceBuffer
    /**
     * @type {!Size}
     */
    this.size = Size.create(0, 0)

    // this._opaqueTransmuxer = new muxjs.mp4.Transmuxer()
    // this._opaqueNeedInit = true
    this._opaqueBufferDecodingResolve = null
    // this._opaqueSourceBuffer.addEventListener('updateend', () => this._opaqueBufferDecodingResolve())
    this.opaqueVideoElement.addEventListener('timeupdate', (e) => {
      console.log(this.opaqueVideoElement.webkitDecodedFrameCount)
      this._opaqueBufferDecodingResolve()
    })

    // this._alphaNeedInit = true
    this._alphaBufferDecodingResolve = null
    // this._alphaSourceBuffer.addEventListener('updateend', () => this._alphaBufferDecodingResolve())
    this.alphaVideoElement.addEventListener('timeupdate', () => this._alphaBufferDecodingResolve())

    this._opaqueMp4Muxer = new VideoConverter(this.opaqueVideoElement, 60, 1)
    this._alphaMp4Muxer = new VideoConverter(this.alphaVideoElement, 60, 1)
  }

  /**
   * @param {EncodedFrame}encodedFrame
   * @override
   */
  async update (encodedFrame) {
    const fragment = encodedFrame.pixelContent[0]

    const opaqueData = fragment.opaque
    // let opaqueFragment = null
    // if (this._opaqueNeedInit) {
    //   this._opaqueNeedInit = false
    //   opaqueFragment = this._opaqueMp4Muxer.toInitFrameFragment(opaqueData)
    // } else {
    //   opaqueFragment = this._opaqueMp4Muxer.toFrameFragment(opaqueData)
    // }

    this._opaqueMp4Muxer.appendRawData(opaqueData)
    const [opaqueDts, opaquePayload] = this._opaqueMp4Muxer.remuxer.createNextFrame()
    this._opaqueMp4Muxer.writeFragment(opaqueDts, opaquePayload)

    const alphaData = fragment.alpha
    // let alphaFragment = null
    // if (this._alphaNeedInit) {
    //   this._alphaNeedInit = false
    //   alphaFragment = this._alphaMp4Muxer.toInitFrameFragment(alphaData)
    // } else {
    //   alphaFragment = this._alphaMp4Muxer.toFrameFragment(alphaData)
    // }

    this._alphaMp4Muxer.appendRawData(alphaData)
    const [alphaDts, alphaPayload] = this._alphaMp4Muxer.remuxer.createNextFrame()
    this._alphaMp4Muxer.writeFragment(alphaDts, alphaPayload)

    const start = Date.now()
    await Promise.all([
      new Promise(resolve => {
        this._opaqueBufferDecodingResolve = resolve
        // this._opaqueSourceBuffer.appendBuffer(opaqueFragment)
      }),
      alphaData ? new Promise(resolve => {
        this._alphaBufferDecodingResolve = resolve
        // this._alphaSourceBuffer.appendBuffer(alphaFragment)
      }) : Promise.resolve()
    ])
    console.log(`|- Decoding buffer took ${Date.now() - start}ms`)

    const videoWidth = this.opaqueVideoElement.videoWidth
    const videoHeight = this.opaqueVideoElement.videoHeight

    // const isSubImage = this.size.w === videoWidth && this.size.h === videoHeight

    // if (isSubImage) {
    //   this.opaqueTexture.subImage2dBuffer(this.opaqueVideoElement, 0, 0)
    // } else {
    this.size = Size.create(videoWidth, videoHeight)
    this.opaqueTexture.image2dBuffer(this.opaqueVideoElement, videoWidth, videoHeight)
    // }

    // if (alphaData) {
    //   if (isSubImage) {
    //     this.alphaTexture.subImage2dBuffer(this.alphaVideoElement, 0, 0)
    //   } else {
    this.alphaTexture.image2dBuffer(this.alphaVideoElement, videoWidth, videoHeight)
    // }
    // }
  }
}

export default Mp4RenderState
