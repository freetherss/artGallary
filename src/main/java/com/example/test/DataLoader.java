package com.example.test;

import com.example.test.domain.ERole;
import com.example.test.domain.Role;
import com.example.test.domain.User;
import com.example.test.repository.RoleRepository;
import com.example.test.repository.UserRepository;

import java.security.SecureRandom;
import java.util.HashSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataLoader.class);

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.initial.admin.username}")
    private String adminUsername;

    @Value("${app.initial.guest.username}")
    private String guestUsername;
    
    // Helper method to generate a random password
    private String generateRandomPassword(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    @Override
    public void run(String... args) throws Exception {
        // Create Roles if they don't exist
        if (roleRepository.findByName(ERole.ROLE_ADMIN).isEmpty()) {
            roleRepository.save(new Role(ERole.ROLE_ADMIN));
        }
        if (roleRepository.findByName(ERole.ROLE_GUEST).isEmpty()) {
            roleRepository.save(new Role(ERole.ROLE_GUEST));
        }

        // Create Admin User
        if (userRepository.findByUsername(adminUsername).isEmpty()) {
            String adminPassword = generateRandomPassword(12);
            User adminUser = new User(adminUsername, passwordEncoder.encode(adminPassword));
            Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                    .orElseThrow(() -> new RuntimeException("Error: Admin Role not found."));
            Set<Role> roles = new HashSet<>();
            roles.add(adminRole);
            adminUser.setRoles(roles);
            userRepository.save(adminUser);

            logger.warn("************************************************************");
            logger.warn("** NO ADMIN USER FOUND - CREATING NEW ADMIN");
            logger.warn("** Admin Username: " + adminUsername);
            logger.warn("** Admin Password: " + adminPassword);
            logger.warn("** Please use this password for first login and change it.");
            logger.warn("************************************************************");
        }

        // Create Guest User
        if (userRepository.findByUsername(guestUsername).isEmpty()) {
            String guestPassword = generateRandomPassword(12);
            User guestUser = new User(guestUsername, passwordEncoder.encode(guestPassword));
            Role guestRole = roleRepository.findByName(ERole.ROLE_GUEST)
                    .orElseThrow(() -> new RuntimeException("Error: Guest Role not found."));
            Set<Role> roles = new HashSet<>();
            roles.add(guestRole);
            guestUser.setRoles(roles);
            userRepository.save(guestUser);

            logger.info("***********************************************************");
            logger.info("** NO GUEST USER FOUND - CREATING NEW GUEST");
            logger.info("** Guest Username: " + guestUsername);
            logger.info("** Guest Password: " + guestPassword);
            logger.info("***********************************************************");
        }
    }
}
