import pixman from './lib/pixman/libpixman-1'

export default class BrowserRegion {
  /**
   *
   * @param {GrRegion} grRegion
   * @returns {BrowserRegion}
   */
  static create (grRegion) {
    const pixmanRegion = pixman._malloc(20)// region struct is pointer + 4*uint32 = 5*4 = 20
    pixman._pixman_region32_init(pixmanRegion)
    const browserRegion = new BrowserRegion(grRegion, pixmanRegion)
    grRegion.implementation = browserRegion
    return browserRegion
  }

  /**
   * Use BrowserRegion.create()
   * @private
   * @param grRegion
   * @param pixmanRegion
   */
  constructor (grRegion, pixmanRegion) {
    this.grRegion = grRegion
    this.pixmanRegion = pixmanRegion
  }

  /**
   *
   * Destroy the region. This will invalidate the object ID.
   *
   *
   * @param {GrRegion} resource
   *
   * @since 1
   *
   */
  destroy (resource) {
    pixman._pixman_region32_fini(this.pixmanRegion)
    pixman._free(this.pixmanRegion)
    resource.destroy()
  }

  /**
   *
   *  Add the specified rectangle to the region.
   *
   *
   * @param {GrRegion} resource
   * @param {Number} x undefined
   * @param {Number} y undefined
   * @param {Number} width undefined
   * @param {Number} height undefined
   *
   * @since 1
   *
   */
  add (resource, x, y, width, height) {
    pixman._pixman_region32_union_rect(this.pixmanRegion, this.pixmanRegion, x, y, width, height)
  }

  /**
   *
   * Subtract the specified rectangle from the region.
   *
   *
   * @param {GrRegion} resource
   * @param {Number} x undefined
   * @param {Number} y undefined
   * @param {Number} width undefined
   * @param {Number} height undefined
   *
   * @since 1
   *
   */
  subtract (resource, x, y, width, height) {
    const deltaPixmanRegion = pixman._malloc(4 + 4 + 4 + 4 + 4)
    pixman._pixman_region32_init_rect(deltaPixmanRegion, x, y, width, height)
    pixman._pixman_region32_subtract(this.pixmanRegion, this.pixmanRegion, deltaPixmanRegion)
    pixman._pixman_region32_fini(deltaPixmanRegion)
    pixman._free(deltaPixmanRegion)
  }
}