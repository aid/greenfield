import Compositor from './Compositor'
import DataDeviceManager from './DataDeviceManager'
import Subcompositor from './Subcompositor'
import Shell from './Shell'
import XdgWmBase from './XdgWmBase'
import WebShm from './webshm/WebShm'
import WebGL from './webgl/WebGL'
import Seat from './Seat'

class Globals {
  /**
   * @param {Session}session
   * @return {Globals}
   */
  static create (session) {
    const seat = Seat.create(session)

    const compositor = Compositor.create(session)
    const dataDeviceManager = DataDeviceManager.create()
    const subcompositor = Subcompositor.create()

    const shell = Shell.create(session)
    const xdgWmBase = XdgWmBase.create(session, seat)

    const webShm = WebShm.create()
    const webGL = WebGL.create(session)

    return new Globals(session, seat, compositor, dataDeviceManager, subcompositor, shell, xdgWmBase, webShm, webGL)
  }

  /**
   * @param {Session}session
   * @param {Seat}seat
   * @param {Compositor}compositor
   * @param {DataDeviceManager}dataDeviceManager
   * @param {Subcompositor}subcompositor
   * @param {Shell}shell
   * @param {XdgWmBase}xdgWmBase
   * @param {WebShm}webShm
   * @param {WebGL}webGL
   */
  constructor (
    session,
    seat,
    compositor,
    dataDeviceManager,
    subcompositor,
    shell,
    xdgWmBase,
    webShm,
    webGL
  ) {
    /**
     * @type {Session}
     */
    this.session = session
    /**
     * @type {Seat}
     */
    this.seat = seat
    /**
     * @type {Array<Output>}
     */
    this.outputs = []
    /**
     * @type {Compositor}
     */
    this.compositor = compositor
    /**
     * @type {DataDeviceManager}
     */
    this.dataDeviceManager = dataDeviceManager
    /**
     * @type {Subcompositor}
     */
    this.subcompositor = subcompositor
    /**
     * @type {Shell}
     */
    this.shell = shell
    /**
     * @type {XdgWmBase}
     */
    this.xdgWmBase = xdgWmBase
    /**
     * @type {WebShm}
     */
    this.webShm = webShm
    /**
     * @type {WebGL}
     */
    this.webGL = webGL
  }

  /**
   * @param {Output}output
   */
  registerOutput (output) {
    this.outputs = [...this.outputs, output]
    output.registerGlobal(this.session.display.registry)
  }

  /**
   * @param {Output}output
   */
  unregisterOutput (output) {
    output.unregisterGlobal()
    this.outputs = this.outputs.filter(otherOutput => otherOutput !== output)
  }

  register () {
    this.compositor.registerGlobal(this.session.display.registry)
    this.dataDeviceManager.registerGlobal(this.session.display.registry)
    this.seat.registerGlobal(this.session.display.registry)
    this.shell.registerGlobal(this.session.display.registry)
    this.subcompositor.registerGlobal(this.session.display.registry)

    this.xdgWmBase.registerGlobal(this.session.display.registry)

    this.webShm.registerGlobal(this.session.display.registry)
    this.webGL.registerGlobal(this.session.display.registry)
  }

  unregister () {
    this.compositor.unregisterGlobal()
    this.dataDeviceManager.unregisterGlobal()
    this.seat.unregisterGlobal()
    this.shell.unregisterGlobal()
    this.subcompositor.unregisterGlobal()

    this.xdgWmBase.unregisterGlobal()

    this.webShm.unregisterGlobal()
    this.webGL.unregisterGlobal()
  }
}

export default Globals
