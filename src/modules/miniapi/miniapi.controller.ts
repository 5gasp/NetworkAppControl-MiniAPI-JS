import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import NEFService from './services/nef.service';
import { MiniAPIConfiguration } from './types/nef.configuration';
import { NEFOperationType } from './types/nef.enums';
import MiniAPIService from './services/miniapi.service';

@ApiTags('MiniAPI')
@Controller('miniapi')
export default class MiniAPIController {
  testVariables: MiniAPIConfiguration;

  constructor(
    private readonly nefService: NEFService,
    private readonly miniApiService: MiniAPIService,
  ) {}

  @Get('/')
  healthcheck() {
    return 'MiniAPI OK';
  }

  @Post('/configure')
  async configureNEF(@Body() payload: any) {
    console.info('NEF Configure', payload);
    const { variables } = payload;
    this.testVariables = variables;
    return 'Variables Saved!';
  }

  @Post('/monitoring/callback')
  async monitoringCallback(@Body() payload: any) {
    console.info('Monitoring callback', payload);
    this.nefService.monitoringCallback(payload);
  }

  @Post('/session-with-qos/callback')
  async qosCallback(@Body() payload: any) {
    console.info('Qos callback', payload);
    this.nefService.qosCallback(payload);
  }

  @Post('/start/:operationId')
  async startNEFTest(
    @Param('operationId') operationId: NEFOperationType,
    @Body() payload: any = null,
    @Query('target_ip') targetIp: string = null,
    @Query('target') target: string = null,
    @Query('ue_count') ueCount: number = null,
    // @Body('isServer') isServer: boolean = false,
    // @Body('targetPort') targetPort: number = null,
    // @Body('target') target: string = null
  ) {
    try {
      console.info('NEF Start Operation', operationId.toString());
      switch (operationId) {
        case NEFOperationType.NEF_AUTHENTICATION:
        case NEFOperationType.AUTHENTICATION_WITH_5GS:
          await this.nefService.login({
            ip: this.testVariables.NEF_IP,
            port: this.testVariables.NEF_PORT,
            username: this.testVariables.NEF_LOGIN_USERNAME,
            password: this.testVariables.NEF_LOGIN_PASSWORD,
          });
          return 'Login Done';
        case NEFOperationType.CREATE_UE:
          await this.nefService.createUE(
            this.testVariables.UE1_NAME,
            this.testVariables.UE1_DESCRIPTION,
            this.testVariables.UE1_IPV4,
            this.testVariables.UE1_IPV6,
            this.testVariables.UE1_MAC_ADDRESS,
            this.testVariables.UE1_SUPI,
          );
          return 'Created UE';
        case NEFOperationType.GET_UES:
          await this.nefService.getUEs();
          return 'Got UEs';
        case NEFOperationType.NEF_LOCATION_SUBSCRIPTION:
          await this.nefService.subscribeEvent(
            this.testVariables.SUBS_CALLBACK_URL,
            this.testVariables.SUBS_MONITORING_TYPE,
            this.testVariables.SUBS_MONITORING_EXPIRE_TIME,
            this.testVariables.SUBS_EXTERNAL_ID,
          );
          return 'Subscription Done';
        case NEFOperationType.UE_PATH_LOSS:
          await this.nefService.getUEPathLoss(this.testVariables.UE1_SUPI);
          return 'Got UE Path Loss Information';
        case NEFOperationType.ACQUISITION_OF_RSRP:
          await this.nefService.getRSRPInfo(this.testVariables.UE1_SUPI);
          return 'Got UE RSRP Information';
        case NEFOperationType.SERVING_CELL_INFO:
          await this.nefService.getUEServingCellInfo(
            this.testVariables.UE1_SUPI,
          );
          return 'Got UE Serving Cell Information';
        case NEFOperationType.HANDOVER:
          await this.nefService.getUEHandoverEvent(this.testVariables.UE1_SUPI);
          return 'Got UE Handover Information';
        case NEFOperationType.SUBSCRIBE_QOS_EVENT:
          await this.nefService.subscribeQosEvent(payload);
          return 'QoS Subscription Done';
        case NEFOperationType.E2E_SINGLE_UE_LATENCY_AND_THROUGHPUT:
          return this.miniApiService.runE2EUELatencyAndThroughputTest(
            operationId,
            targetIp,
          );
        case NEFOperationType.E2E_MULTIPLE_UE_LATENCY_AND_THROUGHPUT:
          return this.miniApiService.runE2EUELatencyAndThroughputTest(
            operationId,
            targetIp,
            ueCount,
          );
        case NEFOperationType.NEF_CALLBACK_MAX_CONNECTIONS:
          return this.miniApiService.startNEFCallbackMaxConnectionsTest(
            operationId,
          );
        case NEFOperationType.MAX_CONNECTIONS:
          return this.miniApiService.startMaxConnectionsTest(operationId);
        case NEFOperationType.MAX_HOPS:
          return this.miniApiService.startMaxHopsTest(operationId, target);
        default:
          throw new BadRequestException();
      }
    } catch (error) {
      console.error(`NEF Start Error: ${error.message}`);
      throw new BadRequestException();
    }
  }

  @Get('/results/:operationId')
  async getResults(@Param('operationId') operationId: NEFOperationType) {
    try {
      console.info('NEF Get Test Results Operation', operationId.toString());
      switch (operationId) {
        case NEFOperationType.E2E_SINGLE_UE_LATENCY_AND_THROUGHPUT:
          return this.miniApiService.getE2EUELatencyAndThroughputTestResults(
            false,
          );
        case NEFOperationType.E2E_MULTIPLE_UE_LATENCY_AND_THROUGHPUT:
          return this.miniApiService.getE2EUELatencyAndThroughputTestResults(
            true,
          );
        case NEFOperationType.MAX_HOPS:
          return this.miniApiService.getMaxHopsTestResults();
        default:
          return this.miniApiService.getOperationTestResults(operationId);
      }
    } catch (error) {
      console.error(`NEF Get Test Results Error: ${error.message}`);
      throw new BadRequestException();
    }
  }

  @Post('/stop/:operationId')
  async stopNEFTest(@Param('operationId') operationId: NEFOperationType) {
    try {
      console.info('NEF Stop Operation', operationId.toString());
      return this.miniApiService.stopProcess(operationId);
    } catch (error) {
      console.error(`NEF Stop Error: ${error.message}`);
      throw new BadRequestException();
    }
  }
}
