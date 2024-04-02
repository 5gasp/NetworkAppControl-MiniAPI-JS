export interface MiniAPIConfiguration {
  NEF_IP: string;
  NEF_PORT: number;
  NEF_LOGIN_USERNAME: string;
  NEF_LOGIN_PASSWORD: string;
  SUBS_MONITORING_TYPE: string;
  SUBS_EXTERNAL_ID: string;
  SUBS_CALLBACK_URL: string;
  SUBS_MONITORING_EXPIRE_TIME: string;
  UE1_NAME: string;
  UE1_DESCRIPTION: string;
  UE1_IPV4: string;
  UE1_IPV6: string;
  UE1_MAC_ADDRESS: string;
  UE1_SUPI: string;
}

export interface NefLoginParams {
  ip: string;
  port: string | number;
  username: string;
  password: string;
}
