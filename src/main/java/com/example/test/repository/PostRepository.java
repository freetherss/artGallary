package com.example.test.repository;

import com.example.test.domain.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    // Pageable을 사용하여 최신순으로 게시물을 정렬하고 페이지네이션을 적용
    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Post> findByHashtagsContainingOrderByCreatedAtDesc(String hashtag, Pageable pageable);
}
