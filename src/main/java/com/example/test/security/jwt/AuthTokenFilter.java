package com.example.test.security.jwt;

import com.example.test.service.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.PathMatcher;

import java.util.Arrays;
import java.util.List;

public class AuthTokenFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

    private PathMatcher pathMatcher = new AntPathMatcher();

    // List of URL patterns that should not be filtered by this JWT filter.
    // These should correspond to paths that are permitAll() in SecurityConfig
    // AND should NOT attempt JWT validation regardless of method (e.g., static resources).
    private static final List<String> PUBLIC_URL_PATTERNS = Arrays.asList(
        "/api/auth/**",       // Covers signin and signup
        "/uploads/**",        // for serving images
        "/css/**",            // static css
        "/js/**",             // static js
        "/",                // homepage
        "/index.html",
        "/login.html",
        "/signup.html",
        "/favicon.ico",       // Added favicon
        "/error"              // Added error page
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        // REMOVED THE SPECIFIC '/api/posts' BYPASS.
        // Now, /api/posts requests will pass through doFilterInternal
        
        boolean match = PUBLIC_URL_PATTERNS.stream().anyMatch(pattern -> pathMatcher.match(pattern, path));
        if (match) {
            logger.info("AuthTokenFilter: Bypassing filter for path: " + path + " (matched by pattern)");
        } else {
            logger.info("AuthTokenFilter: Applying filter for path: " + path);
        }
        return match;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = parseJwt(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                String username = jwtUtils.getUserNameFromJwtToken(jwt);

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            } else {
                // ADDED MORE SPECIFIC LOGGING HERE
                if (jwt == null) {
                    logger.info("AuthTokenFilter: No JWT token found in request for path: {}", request.getRequestURI());
                } else {
                    logger.warn("AuthTokenFilter: JWT token validation failed for path: {}", request.getRequestURI());
                }
            }
        } catch (Exception e) {
            logger.error("AuthTokenFilter: Cannot set user authentication for path {}: {}", request.getRequestURI(), e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
