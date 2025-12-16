package com.example.test.repository;

import com.example.test.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    // 최신순으로 게시물을 정렬하기 위한 메소드
    List<Post> findAllByOrderByCreatedAtDesc();

    List<Post> findByHashtagsContainingOrderByCreatedAtDesc(String hashtag);
}
