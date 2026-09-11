import Fastify, { type FastifyInstance } from 'fastify';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { PROBLEM_META, ProblemIdSchema, ProblemInputSchemas, RunRequestSchema } from '@jab/contracts';
import { JavaRunner, isProblemReady } from './runner.js';

export type AppOptions={runner?:JavaRunner;allowedOrigins?:string[];allowedHosts?:string[]};
export async function buildApp(options:AppOptions={}):Promise<FastifyInstance> {
  const app=Fastify({bodyLimit:131072,logger:false});
  const runner=options.runner??new JavaRunner();const token=randomBytes(32).toString('hex');
  const hosts=new Set(options.allowedHosts??['127.0.0.1:3001','localhost:3001','127.0.0.1:5173','localhost:5173']);
  const origins=new Set(options.allowedOrigins??['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:3001','http://localhost:3001']);
  app.addHook('onRequest',async(request,reply)=>{
    const origin=request.headers.origin;
    if(!hosts.has(request.headers.host??'') || (origin!==undefined&&!origins.has(origin))){return reply.code(403).send({requestId:request.id,status:'INVALID_INPUT',reason:'FORBIDDEN_ORIGIN',message:'仅允许本机同源请求'});}
    reply.header('Cache-Control','no-store');reply.header('X-Content-Type-Options','nosniff');
    if(request.method==='POST') {
      const supplied=request.headers['x-java-algo-session'];
      if(typeof supplied!=='string'||!/^[a-f0-9]{64}$/.test(supplied)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token))||!origin){return reply.code(403).send({requestId:request.id,status:'INVALID_INPUT',reason:'SESSION_REQUIRED',message:'请从本机工作台重新获取会话'});}
    }
  });
  app.setErrorHandler((error,request,reply)=>{
    const code=typeof error==='object'&&error!==null&&'statusCode' in error?error.statusCode:500;
    const status=code===413?413:code===415?400:code===400?400:500;
    return reply.code(status).send({requestId:request.id,status:status===500?'SYSTEM_ERROR':'INVALID_INPUT',reason:status===413?'BODY_TOO_LARGE':status===500?'INTERNAL_ERROR':'MALFORMED_REQUEST',message:status===500?'本地服务异常':'请求格式或大小不符合要求'});
  });
  app.get('/api/health',async()=>({status:'ok',runner:await runner.getAvailability()}));
  app.get('/api/session',async()=>({token}));
  app.post('/api/runs',async(request,reply)=>{
    const parsed=RunRequestSchema.safeParse(request.body);
    if(!parsed.success){
      const body=request.body;let reason='INVALID_REQUEST';
      if(typeof body==='object'&&body!==null) {
        const problem=ProblemIdSchema.safeParse('problemId' in body?body.problemId:undefined);
        if(problem.success&&!isProblemReady(problem.data))reason='PROBLEM_NOT_READY';
        else if(problem.success&&'lessonVersion' in body&&body.lessonVersion!==PROBLEM_META[problem.data].lessonVersion)reason='LESSON_VERSION_MISMATCH';
        else if('source' in body&&typeof body.source==='string'&&Buffer.byteLength(body.source)>65536)reason='SOURCE_TOO_LARGE';
        else if(problem.success&&'mode' in body&&body.mode==='run'&&'input' in body&&!ProblemInputSchemas[problem.data].safeParse(body.input).success)reason='SITE_LIMIT';
      }
      return reply.code(400).send({requestId:request.id,status:'INVALID_INPUT',reason,message:parsed.error.issues.map(i=>i.message).join('; ').slice(0,1000)});
    }
    if(!isProblemReady(parsed.data.problemId))return reply.code(400).send({requestId:request.id,status:'INVALID_INPUT',reason:'PROBLEM_NOT_READY',message:`题目 ${parsed.data.problemId} 的课程尚未注册`});
    const controller=new AbortController();
    const cancel=()=>{if(!reply.raw.writableEnded)controller.abort();};reply.raw.on('close',cancel);
    try {
      const result=await runner.execute(parsed.data,{requestId:request.id,signal:controller.signal});
      const status=result.reason==='QUEUE_FULL'?429:result.status==='RUNNER_UNAVAILABLE'?503:result.status==='SYSTEM_ERROR'?500:200;
      return reply.code(status).send(result);
    }finally{reply.raw.off('close',cancel);}
  });
  app.addHook('preClose',async()=>{await runner.close();});
  return app;
}
