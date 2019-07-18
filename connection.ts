import { EventEmitter } from "events";
import util from "util";
import ssh from "ssh2";

function copy <T>(obj: T): T {
  return Object.assign({}, obj);
}

function connectOpts<T extends object>(opts: T): Omit<T, "host"> {
  return Object.keys(opts).filter(key => key !== 'host').reduce((a,c) => a[c] = (opts as any)[c], {} as any);
}

function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  return Object.entries(obj).filter(entry => entry[0] !== 'host').reduce((a,[key,value]) => a[key as keyof T] = value, {} as T);
}

export interface ConnectionOptions extends ssh.ConnectConfig {
  proxy?: ConnectionOptions;
}

export class Connection extends EventEmitter {
  proxyOpts?: ConnectionOptions;

  tunnel?: ssh.Client;
  proxiedSession?: ssh.Client;

  // default state is closed
  private _state: "closed" | "authenticated" = "closed";

  constructor(private options: ConnectionOptions = {}) {
    super();
    this.proxyOpts = options.proxy ? copy(options.proxy) : undefined;

    if (this.proxyOpts && !this.proxyOpts.privateKey && options.privateKey) {
      this.proxyOpts.privateKey = options.privateKey;
      if (options.passphrase) {
        this.proxyOpts.passphrase = options.passphrase;
      }
    }

    this.on('ready', () => {
      this._state = "authenticated";
    });

    this.connect();
  }

  /**
   * Connects using the constructed configuration, takes into acount the proxying
   */
  public async connect() {
    let connection = this.tunnel = await this.createTunnelConnection();

    if (this.proxyOpts && this.proxyOpts.host && this.proxyOpts.port) {
      // now we listen for connection and then netcat, then reassign connection to the new ssh session, then profit
      connection = this.proxiedSession = await this.createProxyConnection();
    }

    this.emit('ready', connection);

    return connection;
  }

  /**
   * Returns the target connection
   */
  public get connection() {
    return this.proxiedSession || this.tunnel;
  }

  /**
   * Creates a proxied SSH session using netcat
   */
  private createProxyConnection(): Promise<ssh.Client> {
    return new Promise((resolve, reject) => {
      if (!this.proxyOpts) return reject(new Error("Cannot create proxy without proxyOpts"));
      const { host, port } = this.proxyOpts;
      if (!host || !port) return reject(new Error("Cannot create proxy without host and port"));
      const proxiedSession = new ssh.Client();
      // run netcat to get an ssh stream over stdio
      this.tunnel!.exec(`nc ${host} ${port}`, (err, stream) => {
        if (err) {
          reject(err);
          return this.tunnel!.end();
        }
        // we have the stream, pass it on to ssh2 and resolve it!
        this.proxyOpts!.sock = stream;
        proxiedSession.on('error', reject);
        proxiedSession.once('ready', () => {
          proxiedSession.removeListener('error', reject);
          proxiedSession.on('error', this.emit.bind(this, 'error'));
          resolve(proxiedSession);
        });
        proxiedSession.connect(omit(this.proxyOpts!, ["host", "proxy"]));
      });
    });
  }

  /**
   * Creates a standard SSH session using ssh
   */
  private createTunnelConnection(): Promise<ssh.Client> {
    return new Promise((resolve, reject) => {
      let tunnel = new ssh.Client();
      tunnel.on('error', reject);
      tunnel.once('ready', () => {
        tunnel.removeListener('error', reject);
        tunnel.on('error', this.emit.bind(this, 'error'));
        resolve(tunnel);
      });
      tunnel.connect(this.options);
    });
  }
}