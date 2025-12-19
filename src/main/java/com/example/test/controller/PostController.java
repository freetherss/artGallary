package com.example.test.controller;

import com.example.test.domain.Post; // Keep Post for internal mapping
import com.example.test.dto.PostDto; // Import PostDto
import com.example.test.dto.UserDto; // Import UserDto (though not directly used as request/response here)
import com.example.test.service.PostService;
import com.example.test.service.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    @Autowired
    public PostController(PostService postService) {
        this.postService = postService;
    }

    // Helper method to convert PostDto to Post entity for service layer
    private Post convertToEntity(PostDto postDto) {
        Post post = new Post();
        post.setId(postDto.getId());
        post.setTitle(postDto.getTitle());
        post.setDescription(postDto.getDescription());
        // imagePath is set by service when new image uploaded, or retrieved from existing post
        // post.setImagePath(postDto.getImagePath()); // Don't set imagePath directly from DTO here
        post.setHashtags(postDto.getHashtags());
        // createdAt is set by service/DB for new posts, or retrieved from existing post
        // post.setCreatedAt(postDto.getCreatedAt());
        // User is set by service
        return post;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PostDto> createPost(@Valid @RequestPart("post") PostDto postDto,
                                          @RequestPart(value = "imageFile", required = false) MultipartFile imageFile,
                                          @AuthenticationPrincipal UserDetailsImpl userDetails) throws IOException {
        Post postEntity = convertToEntity(postDto); // Convert DTO to entity
        PostDto savedPostDto = postService.savePost(postEntity, imageFile, userDetails);
        return ResponseEntity.status(201).body(savedPostDto);
    }

    @GetMapping
    public List<PostDto> getAllPosts(@RequestParam(required = false) String tag) {
        if (tag != null && !tag.isEmpty()) {
            return postService.findPostsByTag(tag);
        }
        return postService.findAllPosts();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @postSecurityService.isOwner(#id, principal.username)")
    public ResponseEntity<PostDto> updatePost(@PathVariable Long id,
                                          @Valid @RequestPart("post") PostDto postDto,
                                          @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) throws IOException {
        Post postEntity = convertToEntity(postDto); // Convert DTO to entity for update
        postEntity.setImagePath(postDto.getImagePath()); // Set imagePath for potential update/removal logic in service
        return postService.updatePost(id, postEntity, imageFile)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostDto> getPostById(@PathVariable Long id) {
        return postService.findPostById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @postSecurityService.isOwner(#id, principal.username)")
    public ResponseEntity<Void> deletePost(@PathVariable Long id) {
        postService.deletePost(id);
        return ResponseEntity.noContent().build();
    }
}