document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
});

async function fetchPosts(tag = '') {
    try {
        const url = tag ? `http://localhost:8081/api/posts?tag=${tag}` : 'http://localhost:8081/api/posts';
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
            <img src="${post.imagePath}" alt="${post.description}">
            <h3>${post.description}</h3>
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
        const response = await fetch(`http://localhost:8081/api/posts/${id}`);
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
            <img src="${post.imagePath}" alt="${post.description}" class="detail-image">
            <h2>${post.description}</h2>
            <p>${post.hashtags ? post.hashtags.split(',').map(tag => `<span class="hashtag" data-tag="${tag.trim()}">#${tag.trim()}</span>`).join(' ') : ''}</p>
            <p>Posted on: ${new Date(post.createdAt).toLocaleDateString()}</p>
            <button class="edit-button" data-post-id="${post.id}">Edit</button>
            <button class="delete-button" data-post-id="${post.id}">Delete</button>
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

    const editButton = modal.querySelector('.edit-button');
    if (editButton) {
        editButton.addEventListener('click', () => {
            closePostDetailModal(); // Close detail modal
            openEditPostModal(post); // Open edit modal with current post data
        });
    }
    const deleteButton = modal.querySelector('.delete-button');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this post?')) {
                deletePost(post.id);
            }
        });
    }
}

async function deletePost(id) {
    try {
        const response = await fetch(`http://localhost:8081/api/posts/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        closePostDetailModal(); // Close the detail modal after deletion
        fetchPosts(); // Refresh the gallery
        alert('Post deleted successfully!');
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Failed to delete post: ' + error.message);
    }
}

function closePostDetailModal() {
    const modal = document.getElementById('postDetailModal');
    if (modal) {
        modal.style.display = 'none';
    }
}


// --- Create Post Modal Logic ---
const createPostBtn = document.getElementById('createPostBtn');
const createPostModal = document.getElementById('createPostModal');
const createPostModalCloseBtn = createPostModal.querySelector('.close-button');
const createPostForm = document.getElementById('createPostForm');

if (createPostBtn) {
    createPostBtn.addEventListener('click', () => {
        openCreatePostModal();
    });
}

if (createPostModalCloseBtn) {
    createPostModalCloseBtn.addEventListener('click', () => {
        closeCreatePostModal();
    });
}

if (createPostModal) {
    window.addEventListener('click', (event) => {
        if (event.target === createPostModal) {
            closeCreatePostModal();
        }
    });
}

if (createPostForm) {
    createPostForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(createPostForm);

        const description = formData.get('description');
        const hashtags = formData.get('hashtags');
        const imageFile = formData.get('imageFile');

        // Create a separate FormData for the multipart request
        const postFormData = new FormData();
        
        // Append the post object as a JSON string
        const postDto = {
            description: description,
            hashtags: hashtags
        };
        postFormData.append('post', new Blob([JSON.stringify(postDto)], { type: 'application/json' }));

        // Append the image file if it exists
        if (imageFile && imageFile.size > 0) {
            postFormData.append('imageFile', imageFile);
        }

        try {
            const response = await fetch('http://localhost:8081/api/posts', {
                method: 'POST',
                body: postFormData // No 'Content-Type' header needed; browser sets it for FormData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            // Post created successfully
            closeCreatePostModal();
            createPostForm.reset(); // Clear the form
            fetchPosts(); // Refresh the gallery
        } catch (error) {
            console.error('Error creating post:', error);
            alert('Failed to create post: ' + error.message);
        }
    });
}

function openCreatePostModal() {
    if (createPostModal) {
        createPostModal.style.display = 'block';
    }
}

function closeCreatePostModal() {
    if (createPostModal) {
        createPostModal.style.display = 'none';
    }
}

// --- Edit Post Modal Logic ---
const editPostModal = document.getElementById('editPostModal');
const editPostModalCloseBtn = editPostModal.querySelector('.close-button');
const editPostForm = document.getElementById('editPostForm');
const editPostId = document.getElementById('editPostId');
const editPostDescription = document.getElementById('editPostDescription');
const editPostHashtags = document.getElementById('editPostHashtags');
const editPostImage = document.getElementById('editPostImage'); // For new image upload
const currentImagePathInput = document.getElementById('currentImagePath'); // Hidden input for current image path

if (editPostModalCloseBtn) {
    editPostModalCloseBtn.addEventListener('click', () => {
        closeEditPostModal();
    });
}

if (editPostModal) {
    window.addEventListener('click', (event) => {
        if (event.target === editPostModal) {
            closeEditPostModal();
        }
    });
}

if (editPostForm) {
    editPostForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const postId = editPostId.value;
        const formData = new FormData(editPostForm);

        const description = formData.get('description');
        const hashtags = formData.get('hashtags');
        const imageFile = formData.get('imageFile');

        const postFormData = new FormData();
        
        const postDto = {
            description: description,
            hashtags: hashtags
        };

        // If no new image file is provided, include the existing imagePath in the DTO
        if (!imageFile || imageFile.size === 0) {
            postDto.imagePath = currentImagePathInput.value;
        }

        postFormData.append('post', new Blob([JSON.stringify(postDto)], { type: 'application/json' }));

        if (imageFile && imageFile.size > 0) {
            postFormData.append('imageFile', imageFile);
        }

        try {
            const response = await fetch(`http://localhost:8081/api/posts/${postId}`, {
                method: 'PUT',
                body: postFormData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            closeEditPostModal();
            editPostForm.reset();
            fetchPosts(); // Refresh the gallery
        } catch (error) {
            console.error('Error updating post:', error);
            alert('Failed to update post: ' + error.message);
        }
    });
}

function openEditPostModal(post) {
    if (editPostModal) {
        editPostId.value = post.id;
        editPostDescription.value = post.description;
        editPostHashtags.value = post.hashtags || '';
        currentImagePathInput.value = post.imagePath || ''; // Populate the hidden input with the current image path
        editPostModal.style.display = 'block';
    }
}



