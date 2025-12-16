document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    setupModals();
});

async function fetchPosts(tag = '') {
    try {
        const url = tag ? `/api/posts?tag=${tag}` : '/api/posts';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const posts = await response.json();
        displayPosts(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        document.querySelector('.posts-grid').innerHTML = '<p>Failed to load posts. Please try again later.</p>';
    }
}

function displayPosts(posts) {
    const postsGrid = document.querySelector('.posts-grid');
    postsGrid.innerHTML = ''; // Clear existing content

    if (posts.length === 0) {
        postsGrid.innerHTML = '<p>No posts found.</p>';
        return;
    }

    posts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.dataset.postId = post.id; // Store post ID
        postItem.innerHTML = `
            <img src="${post.imagePath}" alt="${post.title}">
            <h3>${post.title}</h3>
            <p>${post.hashtags ? post.hashtags.split(',').map(tag => `<span class="hashtag" data-tag="${tag.trim()}">#${tag.trim()}</span>`).join(' ') : ''}</p>
        `;
        postsGrid.appendChild(postItem);
    });

    // Add event listener for post clicks to show detail
    postsGrid.querySelectorAll('.post-item').forEach(item => {
        item.addEventListener('click', (event) => {
            const postId = event.currentTarget.dataset.postId;
            showPostDetail(postId);
        });
    });

    // Add event listener for hashtag clicks
    postsGrid.querySelectorAll('.hashtag').forEach(hashtagSpan => {
        hashtagSpan.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent post-item click event
            const tag = event.currentTarget.dataset.tag;
            fetchPosts(tag); // Filter by tag
        });
    });
}

async function showPostDetail(id) {
    try {
        const response = await fetch(`/api/posts/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const post = await response.json();
        renderPostDetailModal(post);
    } catch (error) {
        console.error('Error fetching post detail:', error);
        alert('Failed to load post details.');
    }
}

function renderPostDetailModal(post) {
    let modal = document.getElementById('postDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'postDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-button">&times;</span>
            <img src="${post.imagePath}" alt="${post.title}" class="detail-image">
            <h2>${post.title}</h2>
            <p>${post.description}</p>
            <p>${post.hashtags ? post.hashtags.split(',').map(tag => `#${tag.trim()}`).join(' ') : ''}</p>
            <p>Posted on: ${new Date(post.createdAt).toLocaleDateString()}</p>
            <div class="detail-actions">
                <button id="edit-post-btn" data-post-id="${post.id}">수정</button>
                <button id="delete-post-btn" data-post-id="${post.id}">삭제</button>
            </div>
        </div>
    `;
    modal.style.display = 'block';

    modal.querySelector('.close-button').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    document.getElementById('edit-post-btn').addEventListener('click', () => {
        openPostFormModal(post);
    });

    document.getElementById('delete-post-btn').addEventListener('click', () => {
        if (confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
            deletePost(post.id);
        }
    });
}

function setupModals() {
    const createPostBtn = document.getElementById('create-post-btn');
    const postFormModal = document.getElementById('postFormModal');
    const postForm = document.getElementById('postForm');
    const closeButtons = document.querySelectorAll('.modal .close-button');

    createPostBtn.addEventListener('click', () => {
        openPostFormModal();
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === postFormModal) {
            postFormModal.style.display = 'none';
        }
    });

    postForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const postId = document.getElementById('postId').value;
        const postData = {
            title: document.getElementById('postTitle').value,
            description: document.getElementById('postDescription').value,
            hashtags: document.getElementById('postHashtags').value,
            imagePath: document.getElementById('currentImage').textContent.replace('현재 이미지: ', '') // Retain existing imagePath if no new file
        };
        
        const imageFile = document.getElementById('postImageFile').files[0];

        const formData = new FormData();
        formData.append('post', new Blob([JSON.stringify(postData)], { type: 'application/json' }));
        if (imageFile) {
            formData.append('imageFile', imageFile);
        } else if (postData.imagePath) {
            // If no new file is selected, but there was an existing image,
            // we need to tell the backend to keep it or update if imagePath is explicitly changed
            // For now, we rely on the backend logic to handle missing imageFile correctly for update.
            // If backend needs explicit imagePath for existing, we'd add it here.
        }

        if (postId) {
            await updatePost(postId, formData);
        } else {
            await createPost(formData);
        }
        postFormModal.style.display = 'none';
        fetchPosts(); // Refresh posts
    });
}

function openPostFormModal(post = null) {
    const postFormModal = document.getElementById('postFormModal');
    const postForm = document.getElementById('postForm');
    postForm.reset(); // Clear previous data
    document.getElementById('currentImage').textContent = ''; // Clear current image display

    if (post) {
        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postDescription').value = post.description;
        // document.getElementById('postImagePath').value = post.imagePath; // Removed as it's file input
        document.getElementById('postHashtags').value = post.hashtags;
        postFormModal.querySelector('h2').textContent = '게시물 수정';
        if (post.imagePath) {
            document.getElementById('currentImage').textContent = `현재 이미지: ${post.imagePath.substring(post.imagePath.lastIndexOf('/') + 1)}`;
        }
    } else {
        document.getElementById('postId').value = '';
        postFormModal.querySelector('h2').textContent = '새 게시물';
    }
    postFormModal.style.display = 'block';
}

async function createPost(formData) { // Accepts FormData directly
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData // Send FormData directly
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        alert('게시물이 성공적으로 생성되었습니다.');
    } catch (error) {
        console.error('Error creating post:', error);
        alert('게시물 생성에 실패했습니다.');
    }
}

async function updatePost(id, formData) { // Accepts FormData directly
    try {
        const response = await fetch(`/api/posts/${id}`, {
            method: 'PUT',
            body: formData // Send FormData directly
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        alert('게시물이 성공적으로 수정되었습니다.');
    } catch (error) {
        console.error('Error updating post:', error);
        alert('게시물 수정에 실패했습니다.');
    }
}

async function deletePost(id) {
    try {
        const response = await fetch(`/api/posts/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        alert('게시물이 성공적으로 삭제되었습니다.');
        document.getElementById('postDetailModal').style.display = 'none';
        fetchPosts(); // Refresh posts
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('게시물 삭제에 실패했습니다.');
    }
}

