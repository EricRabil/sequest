/// <reference types="node" />
import { EventEmitter } from "events";
import ssh from "ssh2";
export interface ConnectionOptions extends ssh.ConnectConfig {
    proxy?: ConnectionOptions;
}
export declare class Connection extends EventEmitter {
    private options;
    proxyOpts?: ConnectionOptions;
    tunnel?: ssh.Client;
    proxiedSession?: ssh.Client;
    private _state;
    constructor(options?: ConnectionOptions);
    /**
     * Connects using the constructed configuration, takes into acount the proxying
     */
    connect(): Promise<ssh.Client>;
    /**
     * Returns the target connection
     */
    readonly connection: ssh.Client | undefined;
    /**
     * Creates a proxied SSH session using netcat
     */
    private createProxyConnection;
    /**
     * Creates a standard SSH session using ssh
     */
    private createTunnelConnection;
}
