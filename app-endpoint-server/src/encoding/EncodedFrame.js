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

class EncodedFrame {
  /**
   * @param {number}serial
   * @param {number}encodingType
   * @param {number}encodingOptions
   * @param {number}width
   * @param {number}height
   * @param {Array<EncodedFrameFragment>}fragments
   * @return {EncodedFrame}
   */
  static create (serial, encodingType, encodingOptions, width, height, fragments) {
    return new EncodedFrame(serial, encodingType, encodingOptions, width, height, fragments)
  }

  /**
   * @param {number}serial
   * @param {number}encodingType
   * @param {number}encodingOptions
   * @param {number}width
   * @param {number}height
   * @param {Array<EncodedFrameFragment>}fragments
   */
  constructor (serial, encodingType, encodingOptions, width, height, fragments) {
    /**
     * @type {number}
     */
    this.serial = serial
    /**
     * @type {number}
     * @private
     */
    this._encodingType = encodingType
    /**
     * @type {number}
     * @private
     */
    this._encodingOptions = encodingOptions
    /**
     * @type {number}
     * @private
     */
    this._width = width
    /**
     * @type {number}
     * @private
     */
    this._height = height
    /**
     * @type {Array<EncodedFrameFragment>}
     * @private
     */
    this._fragments = fragments
  }

  /**
   * A single byte array as native buffer:
   * [
   * serial: uin32LE
   * encodingType: uint16LE,
   * encodingOptions: uint16LE,
   * width: uint16LE,
   * height: uint16LE,
   * fragmentElements: uint32LE,
   * fragments: uint8[fragmentElements * fragmentSize],
   * ]
   * @return {Buffer}
   */
  toBuffer () {
    let fragmentsSize = 0

    this._fragments.forEach(fragment => { fragmentsSize += fragment.size })

    const totalFrameSize =
      4 + // serial: uin32LE
      2 + // encodingType: uint16LE
      2 + // encodingOptions: uint16LE
      2 + // width: uint16LE
      2 + // height: uint16LE
      4 + // fragmentElements: uint32LE
      fragmentsSize // fragments data: uint8[]
    const frameBuffer = Buffer.allocUnsafe(totalFrameSize)

    let offset = 0

    frameBuffer.writeUInt32LE(this.serial, offset, true)
    offset += 4

    frameBuffer.writeUInt16LE(this._encodingType, offset, true)
    offset += 2

    frameBuffer.writeUInt16LE(this._encodingOptions, offset, true)
    offset += 2

    frameBuffer.writeUInt16LE(this._width, offset, true)
    offset += 2

    frameBuffer.writeUInt16LE(this._height, offset, true)
    offset += 2

    frameBuffer.writeUInt32LE(this._fragments.length, offset, true)
    offset += 4

    this._fragments.forEach(fragment => { offset = fragment.writeToBuffer(frameBuffer, offset) })

    return frameBuffer
  }
}

module.exports = EncodedFrame
