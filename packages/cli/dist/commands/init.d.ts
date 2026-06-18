interface InitOptions {
    webhookUrl?: string;
    skipInstall?: boolean;
}
export declare function init(options: InitOptions): Promise<void>;
export {};
