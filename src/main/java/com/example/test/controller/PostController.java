package com.example.test.controller;

import com.example.test.Post;
import com.example.test.service.PostService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    @PostMapping
    public ResponseEntity<Post> createPost(@Valid @RequestPart("post") Post post,
                                          @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) throws IOException {
        Post savedPost = postService.savePost(post, imageFile);
        return ResponseEntity.status(201).body(savedPost);
    }

    @GetMapping
    public List<Post> getAllPosts(@RequestParam(required = false) String tag) {
        if (tag != null && !tag.isEmpty()) {
            return postService.findPostsByTag(tag);
        }
        return postService.findAllPosts();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Post> updatePost(@PathVariable Long id,
                                          @Valid @RequestPart("post") Post postDetails,
                                          @RequestPart(value = "imageFile", required = false) MultipartFile imageFile) throws IOException {
        return postService.updatePost(id, postDetails, imageFile)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Post> getPostById(@PathVariable Long id) {
        return postService.findPostById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id) throws IOException {
        postService.deletePost(id);
        return ResponseEntity.noContent().build();
    }
}
