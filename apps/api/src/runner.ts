import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, rm, readdir, readFile, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { z } from 'zod';
import { LIMITS, BinarySearchInputSchema, LinkedListInputSchema, ListGraphSchema, expectedReversedList, RunRequestSchema, type RunRequest, type RunResult, type BinarySearchInput, type LinkedListInput, type ListGraph, type Output } from '@jab/contracts';
import { LessonSchema } from '@jab/contracts';
import { lesson704 } from '@jab/curriculum/704';
import { lesson206 } from '@jab/curriculum/206';

export const RUNNER_IMAGE = 'java-algo-bridge-runner:21.0.12';
export const CONTAINER_LABEL = 'java-algo-bridge.managed=production';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const inputHash = (input: BinarySearchInput | LinkedListInput) => hash(JSON.stringify('head' in input ? { head: input.head } : { nums: input.nums, target: input.target }));
const registeredLessons = { '704': LessonSchema.parse(lesson704), '206': LessonSchema.parse(lesson206) };
export const TEST_INPUTS: BinarySearchInput[] = registeredLessons['704'].testSuite.cases.map(item => BinarySearchInputSchema.parse(item.input));
export const LINKED_TEST_INPUTS: LinkedListInput[] = registeredLessons['206'].testSuite.cases.map(item => LinkedListInputSchema.parse(item.input));
const wireStatus=z.enum(['OK','WRONG_ANSWER','COMPILE_ERROR','RUNTIME_ERROR','TIME_LIMIT','RESOURCE_LIMIT','OUTPUT_LIMIT','SYSTEM_ERROR']);
const packetSchema = z.strictObject({status:wireStatus, phase:z.enum(['compile','execute','infrastructure']).optional(), reason:z.string().max(2000).optional(), compileMs:z.number().nonnegative().optional(), cases:z.array(z.strictObject({status:wireStatus,value:z.number().int().min(-2147483648).max(2147483647).optional(),graph:ListGraphSchema.optional(),reason:z.string().max(2000).optional(),elapsedMs:z.number().nonnegative()})).max(16),stdout:z.string().max(LIMITS.outputBytes),stderr:z.string().max(LIMITS.outputBytes),stdoutBytes:z.number().int().nonnegative(),stderrBytes:z.number().int().nonnegative(),truncated:z.boolean()});

/** O(n) checks over original object records; no traversal through untrusted next links. */
export function judgeListGraph(input: LinkedListInput, actual: ListGraph): string | null {
  const expected = expectedReversedList(input);
  if (actual.nodes.length !== expected.nodes.length) return '原节点数量不一致：存在丢失或新增节点';
  const nodes = new Map(actual.nodes.map(node => [node.id, node]));
  if (nodes.size !== actual.nodes.length) return '节点身份重复，不能按节点值合并对象';
  if (actual.headId !== expected.headId) return '返回的头节点身份不正确，需返回原链表最后一个节点';
  for (const node of expected.nodes) {
    const received = nodes.get(node.id);
    if (!received) return `原节点 ${node.id} 丢失或被新节点替代`;
    if (received.value !== node.value) return `原节点 ${node.id} 的值被修改，反转应修改 next 而非交换值`;
    if (received.nextId !== node.nextId) return `原节点 ${node.id} 的 next 不正确：可能形成环、丢失链段或指向新节点`;
  }
  return null;
}
type Command = {code:number|null; stdout:string; stderr:string; timedOut:boolean;outputLimited:boolean};
export type RunnerOptions = {dockerExecutable?:string; image?:string; tempRoot?:string};
export class JavaRunner {
  private readonly docker:string; private readonly image:string; private readonly tempRoot:string;
  private active=false; private closed=false; private waiting=0;
  private readonly tasks=new Set<AbortController>();
  private readonly containers=new Set<string>();
  private availability: {at:number;value:{available:boolean;reason:string|null}}|undefined;
  private availabilityPending:Promise<{available:boolean;reason:string|null}>|undefined;
  private recovery:Promise<void>|undefined;
  constructor(options:RunnerOptions={}) {this.docker=options.dockerExecutable??'docker';this.image=options.image??RUNNER_IMAGE;this.tempRoot=options.tempRoot??tmpdir();}
  private command(args:string[], timeout=5000, signal?:AbortSignal, maxBytes=LIMITS.taskProtocolBytes):Promise<Command> {
    return new Promise(resolve=>{
      const child=spawn(this.docker,args,{windowsHide:true,stdio:['ignore','pipe','pipe']});
      const stdout:Buffer[]=[];const stderr:Buffer[]=[];let bytes=0;let timedOut=false;let outputLimited=false;let finished=false;
      const stop=()=>{timedOut=true;child.kill();}; const timer=setTimeout(stop,timeout);
      signal?.addEventListener('abort',stop,{once:true}); if(signal?.aborted) stop();
      child.stdout.on('data',(b:Buffer)=>{bytes+=b.length;if(bytes<=maxBytes)stdout.push(b);else {outputLimited=true;child.kill();}});
      child.stderr.on('data',(b:Buffer)=>{bytes+=b.length;if(bytes<=maxBytes)stderr.push(b);else {outputLimited=true;child.kill();}});
      const finish=(code:number|null)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',stop);resolve({code,stdout:Buffer.concat(stdout).toString(),stderr:Buffer.concat(stderr).toString(),timedOut,outputLimited});};
      child.on('error',error=>{stderr.push(Buffer.from(error.message));finish(null);});child.on('close',finish);
    });
  }
  private constraints(name:string):string[] {return ['--name',name,'--label',CONTAINER_LABEL,'--network','none','--user','10001:10001','--cap-drop','ALL','--security-opt','no-new-privileges','--read-only','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','128','--tmpfs','/work:rw,nosuid,nodev,size=128m,mode=1777','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777'];}
  async getAvailability():Promise<{available:boolean;reason:string|null}> {
    if(this.closed)return {available:false,reason:'RUNNER_CLOSED'};
    this.availabilityPending??=this.checkAvailability().finally(()=>{this.availabilityPending=undefined;});
    return this.availabilityPending;
  }
  private async checkAvailability():Promise<{available:boolean;reason:string|null}> {
    if(this.availability && Date.now()-this.availability.at<10000)return this.availability.value;
    const name=`jab-probe-${randomUUID()}`;this.containers.add(name);
    const info=await this.command(['info','--format','{{.OSType}}']);
    if(info.code!==0){this.containers.delete(name);return {available:false,reason:info.stderr.includes('ENOENT')?'DOCKER_CLI_UNAVAILABLE':'DOCKER_DAEMON_UNAVAILABLE'};}
    this.recovery??=this.recoverStale();
    try{await this.recovery;}catch(error){this.containers.delete(name);return {available:false,reason:`STALE_CLEANUP_FAILED: ${String(error)}`};}
    const run=await this.command(['run',...this.constraints(name),this.image,'--probe'],10000);
    const cleanup=await this.remove(name);
    const value=run.code===0 && run.stdout.trim()==='{"available":true}' && cleanup ? {available:true,reason:null} : {available:false,reason:`DOCKER_OR_LIMITS_UNAVAILABLE: ${(run.stderr||run.stdout||'CLI/daemon/image unavailable').slice(0,1500)}`};
    this.availability={at:Date.now(),value};return value;
  }
  private async remove(name:string):Promise<boolean> {
    const removed=await this.command(['rm','-f',name]);
    const okay=removed.code===0 || removed.stderr.includes('No such container');
    if(okay)this.containers.delete(name);return okay;
  }
  private async recoverStale():Promise<void> {
    const cutoff=Date.now()-120000;
    const listed=await this.command(['ps','-aq','--filter',`label=${CONTAINER_LABEL}`]);
    if(listed.code!==0)throw new Error('Cannot inspect project containers');
    for(const id of listed.stdout.trim().split(/\s+/).filter(Boolean)) {
      if(!/^[a-f0-9]{12,64}$/.test(id))continue;
      const inspected=await this.command(['inspect','--format','{{.Created}}',id]);
      if(inspected.code===0 && Date.parse(inspected.stdout.trim())<cutoff && !await this.remove(id))throw new Error('Cannot remove stale project container');
    }
    const root=resolve(this.tempRoot);
    for(const entry of await readdir(root,{withFileTypes:true})) {
      if(!entry.isDirectory()||!/^jab-run-[a-zA-Z0-9]+$/.test(entry.name))continue;
      const path=resolve(root,entry.name);
      if(dirname(path)!==root || (await lstat(path)).isSymbolicLink())continue;
      let marker:unknown;try{marker=JSON.parse(await readFile(join(path,'.jab-task.json'),'utf8'));}catch{continue;}
      const parsed=z.strictObject({project:z.literal(CONTAINER_LABEL),createdAt:z.number()}).safeParse(marker);
      if(parsed.success&&parsed.data.createdAt<cutoff)await rm(path,{recursive:true,force:true,maxRetries:3});
    }
  }
  async execute(raw:RunRequest, options:{requestId?:string;signal?:AbortSignal}={}):Promise<RunResult> {
    const started=Date.now();const request=RunRequestSchema.parse(raw);
    const registeredLesson=registeredLessons[request.problemId];
    const result:RunResult={schemaVersion:1,origin:'student-java',requestId:options.requestId??randomUUID(),problemId:request.problemId,lessonVersion:request.lessonVersion,sourceHash:hash(request.source),mode:request.mode,testSuiteVersion:request.mode==='submit'?registeredLesson.testSuite.version:null,phase:'queue',status:'SYSTEM_ERROR',reason:null,cases:[],stdout:'',stderr:'',diagnostics:[],timings:{queueMs:0,compileMs:0,executeMs:0,totalMs:0},output:{stdoutBytes:0,stderrBytes:0,truncated:false},limits:{...LIMITS},cleanup:{status:'done',message:null}};
    const finish=()=>{result.timings.totalMs=Date.now()-started;return result;};
    if(this.closed){result.reason='RUNNER_CLOSED';return finish();}
    if(this.waiting>=4){result.reason='QUEUE_FULL';return finish();}
    const controller=new AbortController();this.tasks.add(controller);
    const abort=()=>controller.abort();options.signal?.addEventListener('abort',abort,{once:true});if(options.signal?.aborted)abort();
    this.waiting++;
    while(this.active&&!controller.signal.aborted&&Date.now()-started<LIMITS.totalMs)await new Promise(resolve=>setTimeout(resolve,15));
    this.waiting--;
    const release=()=>{this.tasks.delete(controller);options.signal?.removeEventListener('abort',abort);};
    if(controller.signal.aborted || Date.now()-started>=LIMITS.totalMs){result.status=controller.signal.aborted?'CANCELLED':'SYSTEM_ERROR';result.reason=controller.signal.aborted?'ABORTED':'QUEUE_TIMEOUT';release();return finish();}
    this.active=true;result.timings.queueMs=Date.now()-started;
    let directory:string|undefined;let name:string|undefined;
    try {
      result.phase='infrastructure';const availability=await this.getAvailability();
      if(!availability.available){result.status='RUNNER_UNAVAILABLE';result.reason=availability.reason;return finish();}
      directory=await mkdtemp(join(this.tempRoot,'jab-run-'));
      await writeFile(join(directory,'.jab-task.json'),JSON.stringify({project:CONTAINER_LABEL,createdAt:Date.now()}));
      const inputs=request.mode==='run'?[request.input]:request.problemId==='704'?TEST_INPUTS:LINKED_TEST_INPUTS;
      await Promise.all([writeFile(join(directory,'Solution.java'),request.source),writeFile(join(directory,'inputs.json'),JSON.stringify(inputs)),writeFile(join(directory,'problem.txt'),request.problemId)]);
      name=`jab-run-${randomUUID()}`;this.containers.add(name);
      const executed=await this.command(['run',...this.constraints(name),'--mount',`type=bind,source=${directory},target=/input,readonly`,this.image],Math.max(1,LIMITS.totalMs-(Date.now()-started)),controller.signal);
      if(controller.signal.aborted){result.status='CANCELLED';result.reason='ABORTED';return finish();}
      if(executed.outputLimited){result.status='OUTPUT_LIMIT';result.output.truncated=true;result.reason='TASK_PROTOCOL_LIMIT';return finish();}
      if(executed.timedOut){result.status='TIME_LIMIT';result.phase='execute';result.reason='TOTAL_TIMEOUT';return finish();}
      if(executed.code!==0){const inspected=await this.command(['inspect','--format','{{.State.OOMKilled}}',name]);result.status=inspected.stdout.trim()==='true'?'RESOURCE_LIMIT':'SYSTEM_ERROR';result.reason=result.status==='RESOURCE_LIMIT'?'OOM_KILLED':'DOCKER_EXECUTION_FAILED';result.stderr=executed.stderr.slice(0,LIMITS.outputBytes);return finish();}
      const packet=packetSchema.parse(JSON.parse(executed.stdout));
      result.phase=packet.phase??'infrastructure';result.stdout=packet.stdout;result.stderr=packet.stderr;result.output={stdoutBytes:packet.stdoutBytes,stderrBytes:packet.stderrBytes,truncated:packet.truncated};result.timings.compileMs=packet.compileMs??0;
      if(packet.status==='SYSTEM_ERROR'){result.status='SYSTEM_ERROR';result.phase='infrastructure';result.reason=packet.reason??'SUPERVISOR_ERROR';return finish();}
      if(packet.phase==='compile') {
        result.status=packet.status==='COMPILE_ERROR'?'COMPILE_ERROR':packet.status==='TIME_LIMIT'?'TIME_LIMIT':packet.status==='OUTPUT_LIMIT'?'OUTPUT_LIMIT':'SYSTEM_ERROR';
        for(const match of packet.stderr.matchAll(/\/input\/Solution\.java:(\d+): (error|warning): ([^\n]+)/g))result.diagnostics.push({fileName:'Solution.java',severity:match[2]==='warning'?'warning':'error',message:match[3]!,line:Number(match[1]),column:null,belongsToStudentSource:true});
      } else if(packet.phase==='execute') {
        result.status='PASSED_LOCAL_TESTS';result.phase='judge';
        for(const [index,item] of packet.cases.entries()) {
          const input=inputs[index];if(!input)throw new Error('Unexpected case');
          const expected:Output='head' in input?expectedReversedList(input):{kind:'int',value:input.nums.indexOf(input.target)};
          const actual:Output|null='head' in input?(item.graph??null):item.value===undefined?null:{kind:'int',value:item.value};
          if(item.status==='OK' && actual===null)throw new Error('Missing typed output');
          const mismatch='head' in input?(item.graph?judgeListGraph(input,item.graph):'缺少链表对象图'):item.value===('nums' in input?input.nums.indexOf(input.target):undefined)?null:'返回下标不正确';
          const status=item.status==='OK'?(mismatch===null?'PASSED':'WRONG_ANSWER'):item.status==='WRONG_ANSWER'?'WRONG_ANSWER':item.status==='TIME_LIMIT'?'TIME_LIMIT':item.status==='OUTPUT_LIMIT'?'OUTPUT_LIMIT':item.status==='RESOURCE_LIMIT'?'RESOURCE_LIMIT':'RUNTIME_ERROR';
          result.cases.push({caseId:request.mode==='run'?'custom':`${request.problemId}-${index+1}`,inputHash:inputHash(input),status,actual,expected,message:status==='PASSED'?'返回值与本站结构约束一致':status==='WRONG_ANSWER'?(item.reason??mismatch??'结果不满足结构约束'):status,elapsedMs:item.elapsedMs});
          result.timings.executeMs+=item.elapsedMs;
          if(status!=='PASSED' && (result.status==='PASSED_LOCAL_TESTS'||status!=='WRONG_ANSWER'))result.status=status;
        }
        if(result.cases.length!==inputs.length && result.status==='PASSED_LOCAL_TESTS')throw new Error('Incomplete case protocol');
        const lastCase=packet.cases.at(-1);
        if(!lastCase||lastCase.status!==packet.status)throw new Error('Inconsistent terminal protocol');
        if(packet.cases.slice(0,-1).some(item=>item.status!=='OK'))throw new Error('Cases after terminal failure');
        if(!['PASSED_LOCAL_TESTS','WRONG_ANSWER'].includes(result.status))result.phase='execute';
      }else{result.status='SYSTEM_ERROR';result.reason=packet.reason??'PROTOCOL_ERROR';}
      return finish();
    }catch(error){result.status='SYSTEM_ERROR';result.reason=`INFRASTRUCTURE_ERROR: ${String(error).slice(0,500)}`;return finish();}
    finally {
      let cleaned=true;if(name)cleaned=await this.remove(name);
      if(directory)try{await rm(directory,{recursive:true,force:true,maxRetries:3});}catch{cleaned=false;}
      result.cleanup={status:cleaned?'done':'failed',message:cleaned?null:'本项目任务清理失败'};
      if(!cleaned){result.status='SYSTEM_ERROR';result.reason='CLEANUP_FAILED';}
      result.timings.totalMs=Date.now()-started;this.active=false;release();
    }
  }
  async close():Promise<void>{this.closed=true;for(const task of this.tasks)task.abort();while(this.active)await new Promise(resolve=>setTimeout(resolve,20));await this.availabilityPending;await Promise.all([...this.containers].map(name=>this.remove(name)));}
}
