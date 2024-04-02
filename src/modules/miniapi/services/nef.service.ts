import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { NefLoginParams } from '../types/nef.configuration';

@Injectable()
export default class NEFService {
  private nefClient: AxiosInstance;

  constructor() {}

  async login(parameters: NefLoginParams) {
    const { ip, port, username, password } = parameters;

    this.nefClient = axios.create({
      baseURL: `http://${ip}:${port}`,
    });

    const formData = new FormData();
    formData.append('grant_type', '');
    formData.append('username', username);
    formData.append('password', password);
    formData.append('scope', '');
    formData.append('client_id', '');
    formData.append('client_secret', '');

    const response = await this.nefClient.post(
      '/api/v1/login/access-token',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      },
    );

    // Check if the login was successful
    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    this.nefClient.defaults.headers.common['Authorization'] =
      `Bearer ${response.data.access_token}`;

    return response.data.access_token;
  }

  async createUEMovementLoop(ueSupi: string) {
    const data = {
      supi: ueSupi,
    };

    const response = await this.nefClient.post(
      `/api/v1/ue_movement/start-loop`,
      data,
    );

    console.log('Initiated UE Movement:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    return response.data;
  }

  async stopUEMovementLoop(ueSupi: string) {
    const url = `/api/v1/ue_movement/stop-loop`;

    const data = {
      supi: ueSupi,
    };

    const response = await this.nefClient.post(url, data);

    console.log('Terminated UE Movement:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    return response.data;
  }

  async getUEs() {
    const response = await this.nefClient.get('/api/v1/UEs');

    console.log('Get UEs Response:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    return response.data;
  }

  async subscribeEvent(
    callbackUrl: string,
    monitoringType: string,
    monitoringExpireTime: string,
    externalId: string,
  ) {
    const monitoringPayload = {
      externalId,
      notificationDestination: callbackUrl,
      monitoringType,
      maximumNumberOfReports: 1,
      monitorExpireTime: monitoringExpireTime,
      maximumDetectionTime: 1,
      reachabilityType: 'DATA',
    };

    const response = await this.nefClient.post(
      '/nef/api/v1/3gpp-monitoring-event/v1/netapp/subscriptions',
      monitoringPayload,
    );

    console.log('Monitoring Subscription Response:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    return response.data;
  }

  async createUE(
    ueName: string,
    ueDescription: string,
    ueIpv4: string,
    ueIpv6: string,
    ueMac: string,
    ueSupi: string,
  ) {
    const payload = {
      name: ueName,
      description: ueDescription,
      ip_address_v4: ueIpv4,
      ip_address_v6: ueIpv6,
      mac_address: ueMac,
      supi: ueSupi,
    };

    const response = await this.nefClient.post('/api/v1/UEs', payload);

    console.log('Create UE Response:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    return response.data;
  }

  async getUEPathLoss(ueSupi: string) {
    const response = await this.nefClient.get(
      `/test/api/v1/UEs/${ueSupi}/path_losses`,
    );

    console.log('Get UEs Path Losses Information:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    return response.data;
  }

  async getUEServingCellInfo(ueSupi: string) {
    // To get the Serving Cell Info, we required to start a new UE Movement Loop
    await this.createUEMovementLoop(ueSupi);

    const response = await this.nefClient.get(
      `/test/api/v1/UEs/${ueSupi}/serving_cell`,
    );

    console.log('Get UE Serving Cell Information:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    await this.stopUEMovementLoop(ueSupi);

    return response.data;
  }

  async getRSRPInfo(ueSupi: string) {
    // To get the Serving Cell Info, we required to start a new UE Movement Loop
    await this.createUEMovementLoop(ueSupi);

    const response = await this.nefClient.get(
      `/test/api/v1/UEs/${ueSupi}/rsrps`,
    );

    console.log('Get UE Serving Cell Information:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    await this.stopUEMovementLoop(ueSupi);

    return response.data;
  }

  async getUEHandoverEvent(ueSupi: string) {
    const response = await this.nefClient.get(
      `/test/api/v1/UEs/${ueSupi}/handovers`,
    );

    console.log('Get UEs Handovers Information:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    return response.data;
  }

  async subscribeQosEvent(monitoringPayload: any) {
    const response = await this.nefClient.post(
      '/nef/api/v1/3gpp-as-session-with-qos/v1/netapp/subscriptions',
      monitoringPayload,
    );

    console.log('QoS Subscription Response:', response.data);

    if (![200, 201, 409].includes(response.status)) {
      throw new Error(`Unexpected response code: ${response.status}`);
    }

    return response.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async monitoringCallback(payload) {
    // TODO: implement monitoring callback
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async qosCallback(payload) {
    // TODO: implement QoS monitoring callback
  }
}
