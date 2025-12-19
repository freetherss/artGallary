package com.example.test.service;

import com.example.test.domain.Post;
import com.example.test.repository.PostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // Import Transactional

@Service("postSecurityService")
public class PostSecurityService {

    @Autowired
    private PostRepository postRepository;

    @Transactional(readOnly = true) // Add this annotation
    public boolean isOwner(Long postId, String username) {
        Post post = postRepository.findById(postId).orElse(null);
        if (post == null || post.getUser() == null) {
            return false;
        }
        return post.getUser().getUsername().equals(username);
    }
}