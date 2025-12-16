package com.example.test.service;

import com.example.test.Post;
import com.example.test.repository.PostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

    @Autowired
    public PostService(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory!", e);
        }
    }

    @Transactional(readOnly = true)
    public List<Post> findAllPosts() {
        return postRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Optional<Post> findPostById(Long id) {
        return postRepository.findById(id);
    }

    @Transactional
    public Post savePost(Post post, MultipartFile imageFile) throws IOException {
        String imagePath = saveImageFile(imageFile);
        post.setImagePath(imagePath);
        return postRepository.save(post);
    }

    @Transactional
    public Optional<Post> updatePost(Long id, Post postDetails, MultipartFile imageFile) throws IOException {
        return postRepository.findById(id)
                .map(post -> {
                    post.setTitle(postDetails.getTitle());
                    post.setDescription(postDetails.getDescription());
                    post.setHashtags(postDetails.getHashtags());

                    if (imageFile != null && !imageFile.isEmpty()) {
                        try {
                            String oldImagePath = post.getImagePath();
                            if (oldImagePath != null && !oldImagePath.isEmpty()) {
                                Path oldImageFile = Paths.get(uploadDir, Paths.get(oldImagePath).getFileName().toString());
                                Files.deleteIfExists(oldImageFile);
                            }
                            
                            String newImagePath = saveImageFile(imageFile);
                            post.setImagePath(newImagePath);
                        } catch (IOException e) {
                            throw new RuntimeException("Failed to update image file", e);
                        }
                    }
                    return postRepository.save(post);
                });
    }

    @Transactional
    public void deletePost(Long id) {
        postRepository.findById(id).ifPresent(post -> {
            String imagePath = post.getImagePath();
            if (imagePath != null && !imagePath.isEmpty()) {
                try {
                    Path imageFile = Paths.get(uploadDir, Paths.get(imagePath).getFileName().toString());
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
        String fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String uniqueFileName = UUID.randomUUID().toString() + fileExtension;
        Path filePath = Paths.get(uploadDir, uniqueFileName);

        Files.copy(imageFile.getInputStream(), filePath);

        return "/uploads/" + uniqueFileName;
    }

    @Transactional(readOnly = true)
    public List<Post> findPostsByTag(String hashtag) {
        return postRepository.findByHashtagsContainingOrderByCreatedAtDesc(hashtag);
    }
}