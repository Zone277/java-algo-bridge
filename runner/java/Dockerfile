FROM eclipse-temurin:21.0.12_8-jdk-noble@sha256:6b104fa1f9278a75c252729cab9d230ce782b828f2269d05c187ea3fddc70adf
WORKDIR /opt/bridge
COPY lib/gson-2.14.0.jar gson.jar
COPY Supervisor.java Adapter.java ListNode.java TreeNode.java ./
RUN javac -cp gson.jar Supervisor.java Adapter.java ListNode.java TreeNode.java && chmod -R a=rX /opt/bridge
USER 10001:10001
ENTRYPOINT ["java","-Xmx96m","-XX:ActiveProcessorCount=1","-cp","/opt/bridge:/opt/bridge/gson.jar","Supervisor"]
