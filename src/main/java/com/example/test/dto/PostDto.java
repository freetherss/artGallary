package com.example.test.dto;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PostDto {
    private Long id;
    private String title;
    private String description;
    private String imagePath;
    private String hashtags;
    private LocalDateTime createdAt;
    private UserDto user; // Changed from User to UserDto
}
