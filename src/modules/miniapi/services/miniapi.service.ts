import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { NEFOperationType } from '../types/nef.enums';

@Injectable()
export default class MiniAPIService {
  private readonly RESULTS_BASE_FILE_NAME = 'client_output';
  private readonly E2E_RESULTS = `${this.RESULTS_BASE_FILE_NAME}_7.json`;
  private readonly E2E_RTT_RESULTS = `${this.RESULTS_BASE_FILE_NAME}_8.json`;
  private readonly MAX_HOPS_RESULTS = `${this.RESULTS_BASE_FILE_NAME}_Def14Perf13.json`;
  private readonly MAX_CONNECTIONS_RESULTS = `${this.RESULTS_BASE_FILE_NAME}_Def14Perf11.txt`;
  private readonly E2E_SINGLE_UE_THROUGHPUT_AND_LATENCY = `${this.RESULTS_BASE_FILE_NAME}_Def14Perf1.json`;
  private readonly E2E_MULTIPLE_UE_THROUGHPUT_AND_LATENCY = `${this.RESULTS_BASE_FILE_NAME}_Def14Perf2.json`;
  private readonly NEF_CALLBACK_MAX_CONNECTIONS_RESULTS = `${this.RESULTS_BASE_FILE_NAME}_Def14Perf7.txt`;

  private RUNNING_PROCESSES = {
    [NEFOperationType.MAX_CONNECTIONS]: [],
    [NEFOperationType.MAX_HOPS]: [],
    [NEFOperationType.E2E_SINGLE_UE_LATENCY_AND_THROUGHPUT]: [],
    [NEFOperationType.E2E_MULTIPLE_UE_LATENCY_AND_THROUGHPUT]: [],
    [NEFOperationType.NEF_CALLBACK_MAX_CONNECTIONS]: [],
  };

  async runE2EUELatencyAndThroughputTest(operationId: NEFOperationType, targetIp: string, numberOfStreams = 1) {
    const filePath = `/tmp/${numberOfStreams > 1 ? this.E2E_MULTIPLE_UE_THROUGHPUT_AND_LATENCY : this.E2E_SINGLE_UE_THROUGHPUT_AND_LATENCY}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const iperfClientProcess = await this.startIperfClient(
      targetIp,
      numberOfStreams,
    );

    if (!iperfClientProcess) {
      throw new HttpException(
        `Couldn't start Iperf3 Client. Thus, the E2E ${numberOfStreams > 1 ? 'Multiple' : 'Single'} UE Throughput and Latency Test could not be started!`,
        400,
      );
    }

    this.RUNNING_PROCESSES[operationId].push(iperfClientProcess.pid);

    return `Started E2E ${numberOfStreams > 1 ? 'Multiple' : 'Single'} UE Throughput and Latency Performance Test.`;
  }

  getE2EUELatencyAndThroughputTestResults(multiple: boolean) {
    try {
      const filePath = `/tmp/${multiple ? this.E2E_MULTIPLE_UE_THROUGHPUT_AND_LATENCY : this.E2E_SINGLE_UE_THROUGHPUT_AND_LATENCY}`;
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      console.log('Processing file:', filePath);

      const { throughputMbps, meanRttMs } = this.processIperfResults(data);

      const results = {
        throughput_mbps: throughputMbps,
        mean_rtt_ms: meanRttMs,
      };

      console.log('Results:', results);
      return results;

    } catch (error) {
      console.error('Error:', error.message);
      throw new HttpException(
        `The E2E ${multiple ? 'Multiple' : 'Single'} UE Throughput and Latency Performance Test is not finished yet!`,
        404,
      );
    }
  }

  async startNEFCallbackMaxConnectionsTest(operationId: NEFOperationType) {
    const filePath = `/tmp/${this.NEF_CALLBACK_MAX_CONNECTIONS_RESULTS}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const netstatProcess = await this.startNetstatCommand(filePath);

    if (!netstatProcess) {
      throw new HttpException(
        'Could not start the connections monitoring process',
        400,
      );
    }

    this.RUNNING_PROCESSES[operationId].push(netstatProcess.pid);

    return 'Connections monitoring process was started...';
  }

  async startMaxConnectionsTest(operationId: NEFOperationType) {
    const filePath = `/tmp/${this.MAX_CONNECTIONS_RESULTS}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const netstatProcess = await this.startNetstatCommand(filePath);

    if (!netstatProcess) {
      throw new HttpException(
        'Could not start the connections monitoring process',
        400,
      );
    }

    this.RUNNING_PROCESSES[operationId].push(netstatProcess.pid);

    return 'Connections monitoring process was started...';
  }

  async startMaxHopsTest(operationId: NEFOperationType, target: string) {
    const filePath = `/tmp/${this.MAX_HOPS_RESULTS}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const maxHopsProcess = this.startMaxHopsComputing(target);

    this.RUNNING_PROCESSES[operationId].push(maxHopsProcess.pid);

    return 'Started Max Hops Performance Test';
  }

  getMaxHopsTestResults() {
    const fs = require('fs');
    const filePath = `/tmp/${this.MAX_HOPS_RESULTS}`;
    if (!fs.existsSync(filePath)) {
      console.error('The Max Hops Performance Test is not finished yet!');
      throw new HttpException(
        'The Max Hops Performance Test is not finished yet!',
        404,
      );
    }

    const data = fs.readFileSync(filePath, 'utf8');
    console.log(data);
    return JSON.parse(data);
  }

  getOperationTestResults(operationId: NEFOperationType) {
    let filePath;
    switch (operationId) {
      case NEFOperationType.NEF_CALLBACK_MAX_CONNECTIONS:
        filePath = `/tmp/${this.NEF_CALLBACK_MAX_CONNECTIONS_RESULTS}`;
        break;
      case NEFOperationType.MAX_CONNECTIONS:
        filePath = `/tmp/${this.MAX_CONNECTIONS_RESULTS}`;
        break;
      case NEFOperationType.MAX_HOPS:
        filePath = `/tmp/${this.MAX_HOPS_RESULTS}`;
        break;
      default:
        console.error('Invalid operationId:', operationId);
        throw new BadRequestException();
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  async stopProcess(operationId: NEFOperationType) {
    const runningProcesses = this.RUNNING_PROCESSES[operationId];
    if (runningProcesses && runningProcesses.length > 0) {
      while (runningProcesses.length) {
        const pid = runningProcesses.pop();
        console.log(`Will kill Process with PID ${pid}`);
        const { exec } = require('child_process');
        exec(`kill -9 ${pid}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error terminating process ${pid}: ${error}`);
            return;
          }
          console.log(`Process with PID ${pid} was terminated`);
        });
      }
      return 'Successfully Cleaned Up test environment';
    }
  }

  private processIperfResults(data) {
    const throughputMbps = data['end']['sum_sent']['bits_per_second'] / 1000000;

    const meanRttsMs = [];
    for (const stream of data['end']['streams']) {
      meanRttsMs.push(stream['sender']['mean_rtt'] * 0.001);
    }

    const meanRttMs = meanRttsMs.reduce((a, b) => a + b, 0) / meanRttsMs.length;

    return { throughputMbps, meanRttMs };
  }

  private async startIperfClient(targetIp: string, numberOfStreams: number): Promise<any> {
    const command = `iperf3 -t 5 -c ${targetIp} -P ${numberOfStreams} -J > ` +
      `/tmp/${numberOfStreams > 1 ? this.E2E_MULTIPLE_UE_THROUGHPUT_AND_LATENCY : this.E2E_SINGLE_UE_THROUGHPUT_AND_LATENCY}`;

    console.log('Running iperf command:', command);

    const process = require('child_process').exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      if (stdout) {
        console.log(`stdout: ${stdout}`);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log('Command iperf finished');
    });

    console.log(`Started Iperf3 client process with ${numberOfStreams} streams...`);
    console.log('Process ID:', process.pid);

    return process;
  }

  private async startNetstatCommand(outputFile: string): Promise<any> {
    const { exec, execSync } = require('child_process');

    let baseCommand = '';
    try {
      execSync(`netstat --version`, { stdio: 'ignore' });
      baseCommand = 'netstat -an | grep "ESTABLISHED"';
    } catch {
      try {
        execSync(`ss --version`, { stdio: 'ignore' });
        baseCommand = 'ss -t state established';
      } catch {
        console.error('Neither netstat nor ss commands are available.');
        return;
      }
    }

    const command = `start_time=$(date +%s); while true; do current_time=$(date +%s); elapsed_time=$((current_time - start_time)); if [ $elapsed_time -ge 300 ]; then break; fi; ${baseCommand} | wc -l >> ${outputFile}; sleep 1; done`;

    console.log('Running netstat monitoring command:', command);

    const process = exec(command, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      if (stdout) {
        console.log(`stdout: ${stdout}`);
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log('Netstat monitoring command finished');
    });

    console.log(`Started netstat monitoring loop process...`);
    console.log('Process ID:', process.pid);

    return process;
  }

  private startMaxHopsComputing(target: string): any {
    const { fork } = require('child_process');

    console.log(`Will compute the number of hops until the target ${target}...`);

    const child = fork(__filename, [], {
      env: { RUN_COMPUTE_MAX_HOPS: true, TARGET: target, MAX_HOPS_RESULTS: this.MAX_HOPS_RESULTS },
      detached: true
    });

    child.on('message', (message) => {
      console.log('computeMaxHops:', message);
    });

    child.on('exit', (code, signal) => {
      console.log(`computeMaxHops process exited with code ${code} and signal ${signal}`);
    });

    child.on('error', (error) => {
      console.error('computeMaxHops process error:', error);
    });

    console.log('Started the hops computation process...');
    console.log('Process ID:', child.pid);

    return child;
  }

  static computeMaxHops(target: string) {
    const { execSync } = require('child_process');
    const fs = require('fs');
    const maxHops = 30;
    let ttl = 1;

    const pingNextTTL = () => {
      process.send(`TTL: ${ttl}`);
      if (ttl > maxHops) {
        process.send(`Could not reach ${target} within ${maxHops} hops.`);
        const result = { [target]: { hops_until_target: -1 } };
        try {
          fs.writeFileSync(`/tmp/${process.env.MAX_HOPS_RESULTS}`, JSON.stringify(result));
        } catch (error) {
          process.send(`Error writing file: ${error}`);
        }
        return;
      }

      const command = `ping -c 3 -t ${ttl} ${target} > /dev/null`;
      process.send(`Running command: ${command}`);
      try {
        execSync(command);
        process.send(`Reached ${target} with ${ttl} hops!`);
        const result = { [target]: { hops_until_target: ttl } };
        try {
          fs.writeFileSync(`/tmp/${process.env.MAX_HOPS_RESULTS}`, JSON.stringify(result));
        } catch (error) {
          process.send(`Error writing file: ${error}`);
        }
      } catch (error) {
        process.send(`Could not reach ${target} with ${ttl} hops. Will try with ${ttl + 1} hops...`);
        ttl++;
        pingNextTTL();
      }
    };

    pingNextTTL();
  }
}

if (process.env.RUN_COMPUTE_MAX_HOPS) {
  const target = process.env.TARGET;
  if (target) {
    // Assuming computeMaxHops is a method of MiniAPIService class that can be made static or extracted as a function
    MiniAPIService.computeMaxHops(target);
  }
  process.exit(0); // Ensure the forked process exits after running computeMaxHops
}
