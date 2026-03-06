package com.crm.config;

import com.crm.multitenancy.TenantInterceptor;
import io.micrometer.observation.ObservationRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registra el TenantInterceptor en MVC y configura un RestClient
 * con propagación automática de contexto de observabilidad (traceparent W3C).
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final TenantInterceptor tenantInterceptor;

    public WebConfig(TenantInterceptor tenantInterceptor) {
        this.tenantInterceptor = tenantInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantInterceptor)
                .addPathPatterns("/api/**");
    }

    /**
     * RestClient con soporte de trazas.
     * Micrometer Tracing inyecta automáticamente el header 'traceparent'
     * en cada llamada saliente cuando se usa ObservationRegistry.
     */
    @Bean
    public RestClient observedRestClient(ObservationRegistry observationRegistry) {
        return RestClient.builder()
                .observationRegistry(observationRegistry)
                .build();
    }
}
