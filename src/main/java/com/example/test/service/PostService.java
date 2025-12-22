package com.example.test.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.example.test.domain.Post;
import com.example.test.domain.User;
import com.example.test.dto.PostDto; // Import PostDto
import com.example.test.dto.UserDto; // Import UserDto
import com.example.test.repository.PostRepository;
import com.example.test.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;


@Service
public class PostService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Autowired
    public PostService(PostRepository postRepository, UserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory!", e);
        }
    }

    // Helper method to convert Post entity to PostDto
    private PostDto convertToDto(Post post) {
        UserDto userDto = null;
        if (post.getUser() != null) {
            User user = post.getUser();
            userDto = new UserDto(user.getId(), user.getUsername());
        }

        return new PostDto(
                post.getId(),
                post.getTitle(),
                post.getDescription(),
                post.getImagePath(),
                post.getHashtags(),
                post.getCreatedAt(),
                userDto
        );
    }

    @Transactional(readOnly = true)
    public Page<PostDto> findAllPosts(Pageable pageable) {
        return postRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public Optional<PostDto> findPostById(Long id) {
        return postRepository.findById(id)
                .map(this::convertToDto);
    }

    @Transactional
    public PostDto savePost(Post post, MultipartFile imageFile, UserDetails userDetails) throws IOException {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        post.setUser(user);

        String imagePath = saveImageFile(imageFile);
        post.setImagePath(imagePath);
        Post savedPost = postRepository.save(post);
        return convertToDto(savedPost); // Return DTO
    }

    @Transactional
    public Optional<PostDto> updatePost(Long id, Post postDetails, MultipartFile imageFile) throws IOException {
        return postRepository.findById(id)
                .map(post -> {
                    // Update fields from postDetails
                    post.setTitle(postDetails.getTitle());
                    post.setDescription(postDetails.getDescription());
                    post.setHashtags(postDetails.getHashtags());

                    // Handle image file update
                    if (imageFile != null && !imageFile.isEmpty()) {
                        try {
                            String oldImagePath = post.getImagePath();
                            if (oldImagePath != null && !oldImagePath.isEmpty()) {
                                // Extract file name from oldImagePath
                                Path oldImageFileName = Paths.get(oldImagePath).getFileName();
                                Path oldImageFile = Paths.get(uploadDir, oldImageFileName.toString());
                                Files.deleteIfExists(oldImageFile);
                            }
                            
                            String newImagePath = saveImageFile(imageFile);
                            post.setImagePath(newImagePath);
                        } catch (IOException e) {
                            throw new RuntimeException("Failed to update image file", e);
                        }
                    } else if (postDetails.getImagePath() == null || postDetails.getImagePath().isEmpty()) {
                         // If no new image and client explicitly removed image, delete old one and set null
                         String oldImagePath = post.getImagePath();
                         if (oldImagePath != null && !oldImagePath.isEmpty()) {
                             Path oldImageFileName = Paths.get(oldImagePath).getFileName();
                             Path oldImageFile = Paths.get(uploadDir, oldImageFileName.toString());
                             try {
                                 Files.deleteIfExists(oldImageFile);
                             } catch (IOException e) {
                                 throw new RuntimeException("Failed to delete old image file", e);
                             }
                         }
                         post.setImagePath(null);
                    }

                    Post updatedPost = postRepository.save(post);
                    return convertToDto(updatedPost); // Return DTO
                });
    }

    @Transactional
    public void deletePost(Long id) {
        postRepository.findById(id).ifPresent(post -> {
            String imagePath = post.getImagePath();
            if (imagePath != null && !imagePath.isEmpty()) {
                try {
                    // Extract file name from imagePath
                    Path imageFileName = Paths.get(imagePath).getFileName();
                    Path imageFile = Paths.get(uploadDir, imageFileName.toString());
                    Files.deleteIfExists(imageFile);
                } catch (IOException e) {
                    throw new RuntimeException("Failed to delete image file for post " + id, e);
                }
            }
            postRepository.delete(post);
        });
    }

    private String saveImageFile(MultipartFile imageFile) throws IOException {
        if (imageFile == null || imageFile.isEmpty()) {
            return null;
        }

        String originalFilename = imageFile.getOriginalFilename();
        
        // --- Security Improvement: File Extension Validation ---
        if (originalFilename == null) {
            throw new IOException("File must have a name.");
        }
        
        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        List<String> allowedExtensions = List.of(".png", ".jpg", ".jpeg", ".gif", ".webp");

        if (!allowedExtensions.contains(fileExtension)) {
            throw new IOException("Invalid file type. Only " + allowedExtensions + " are allowed.");
        }
        // --- End Security Improvement ---

        String uniqueFileName = UUID.randomUUID().toString() + fileExtension;
        Path filePath = Paths.get(uploadDir, uniqueFileName);

        try (var inputStream = imageFile.getInputStream()) {
            Files.copy(inputStream, filePath);
        }

        return "/uploads/" + uniqueFileName;
    }

    @Transactional(readOnly = true)
    public Page<PostDto> findPostsByTag(String hashtag, Pageable pageable) {
        return postRepository.findByHashtagsContainingOrderByCreatedAtDesc(hashtag, pageable)
                .map(this::convertToDto);
    }
}
