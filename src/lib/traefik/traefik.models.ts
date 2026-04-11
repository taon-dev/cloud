export interface TraefikConfig {
  http: {
    routers: Record<string, TraefikRouter>;
    services: Record<string, TraefikService>;
  };
}

export interface TraefikRouter {
  rule: string;
  service: string;
  entryPoints: string[];
  tls?: Record<string, any> | null; // optional for HTTPS routers
}

export interface TraefikService {
  loadBalancer: {
    servers: TraefikServer[];
  };
}

export interface TraefikServer {
  url: string;
}