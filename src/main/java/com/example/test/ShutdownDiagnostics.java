package com.example.test;

import jakarta.annotation.PostConstruct;
import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.lang.management.ThreadMXBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class ShutdownDiagnostics {

    private static final Logger logger = LoggerFactory.getLogger(ShutdownDiagnostics.class);

    @PostConstruct
    public void registerShutdownHook() {
        Thread hook = new Thread(() -> {
            logger.warn("*****************************************************************");
            logger.warn("** SHUTDOWN SIGNAL DETECTED. Generating thread dump before exit. **");
            logger.warn("*****************************************************************");
            dumpThreads();
        });
        Runtime.getRuntime().addShutdownHook(hook);
        logger.info("Thread dump on shutdown hook registered.");
    }

    private void dumpThreads() {
        try {
            ThreadMXBean threadMxBean = ManagementFactory.getThreadMXBean();
            ThreadInfo[] threadInfos = threadMxBean.dumpAllThreads(true, true);
            
            StringBuilder sb = new StringBuilder();
            sb.append("Full thread dump Java-level threads:\n");
            for (ThreadInfo threadInfo : threadInfos) {
                sb.append(threadInfo.toString());
            }
            
            logger.warn(sb.toString());
            logger.warn("Thread dump complete. Check logs for details.");

        } catch (Exception e) {
            logger.error("Failed to generate thread dump.", e);
        }
    }
}
