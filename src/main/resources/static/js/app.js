document.addEventListener('DOMContentLoaded', () => {
    updateNav(); // Call updateNav initially to set navigation state
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isSignupPage = window.location.pathname.endsWith('signup.html');

    if (isLoginPage) {
        setupLoginForm();
    } else if (isSignupPage) {
        setupSignupForm(); // This function will be added next
    } else {
        fetchPosts();
        setupModals();
        setupCreatePostModal(); // Call the new function here
        setupEditPostModal(); // Call for edit post modal setup
    }
});

function getToken() {
    return localStorage.getItem('jwt');
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

function updateNav() {
    const token = getToken();
    const newPostLink = document.getElementById('new-post-link');
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');

    if (token) {
        if (loginLink) loginLink.style.display = 'none';
        if (logoutLink) logoutLink.style.display = 'block';
        if (newPostLink) newPostLink.style.display = 'block';

        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
            });
        }
    } else {
        if (loginLink) loginLink.style.display = 'block';
        if (logoutLink) logoutLink.style.display = 'none';
        if (newPostLink) newPostLink.style.display = 'none';
    }
}

function handleLogout() {
    localStorage.removeItem('jwt');
    window.location.href = '/';
}

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return; // Ensure form exists

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');

        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                // Attempt to parse error message from backend if available
                const errorData = await response.json().catch(() => ({ message: 'Login failed!' }));
                throw new Error(errorData.message || 'Login failed!');
            }

            const data = await response.json();
            localStorage.setItem('jwt', data.token);
            window.location.href = '/';

        } catch (error) {
            errorEl.textContent = error.message || 'Invalid username or password.';
            console.error('Login error:', error);
        }
    });
}

function setupSignupForm() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return; // Ensure form exists

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        const errorEl = document.getElementById('signup-error');

        if (password !== passwordConfirm) {
            errorEl.textContent = 'Passwords do not match!';
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', { // Assuming /api/auth/signup is the endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Sign up failed!' }));
                throw new Error(errorData.message || 'Sign up failed!');
            }

            // On successful signup, redirect to login page
            window.location.href = '/login.html?signupSuccess=true';

        } catch (error) {
            errorEl.textContent = error.message || 'Sign up failed. Please try again.';
            console.error('Signup error:', error);
        }
    });
}

function setupModals() {
    const postFormModal = document.getElementById('postFormModal'); // Correct ID for the modal
    const closeButtons = document.querySelectorAll('.modal .close-button'); // General close buttons

    // Event listeners for general close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside of it
    if (postFormModal) {
        window.addEventListener('click', (event) => {
            if (event.target === postFormModal) {
                postFormModal.style.display = 'none';
            }
        });
    }
    // Note: newPostLinkElement listener is already defined globally.
    // openEditPostModal is called from renderPostDetailModal.
}


async function fetchPosts(tag = '') {
    try {
        const url = tag ? `/api/posts?tag=${tag}` : '/api/posts';
        const headers = {};
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });
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
        const url = `/api/posts/${id}`;
        const headers = {};
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });
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
            <p>Posted by: ${post.user ? post.user.username : 'Unknown'}</p>
            <p>Posted on: ${new Date(post.createdAt).toLocaleDateString()}</p>
            <div class="detail-actions">
                <button id="edit-post-btn" data-post-id="${post.id}" style="display: none;">수정</button>
                <button id="delete-post-btn" data-post-id="${post.id}" style="display: none;">삭제</button>
            </div>
        </div>
    `;
    modal.style.display = 'block';

    const token = getToken();
    if (token) {
        const decodedToken = parseJwt(token);
        const currentUser = decodedToken.sub; // 'sub' typically holds the username
        const roles = decodedToken.roles || []; // Assuming roles are in the token

        const isOwner = post.user && post.user.username === currentUser;
        const isAdmin = roles.includes('ROLE_ADMIN'); // Assuming 'ROLE_ADMIN' for admin role

        if (isOwner || isAdmin) {
            const editButton = document.getElementById('edit-post-btn');
            const deleteButton = document.getElementById('delete-post-btn');
            if (editButton) editButton.style.display = 'inline-block';
            if (deleteButton) deleteButton.style.display = 'inline-block';
        }
    }


    modal.querySelector('.close-button').addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Event listeners for edit and delete buttons
    const editButton = document.getElementById('edit-post-btn');
    if (editButton) {
        editButton.addEventListener('click', () => {
            // Placeholder for edit functionality - open post form modal with current post data
            closePostDetailModal(); 
            openPostFormModal(post); // Use openPostFormModal for editing
        });
    }

    const deleteButton = document.getElementById('delete-post-btn');
    if (deleteButton) {
        deleteButton.addEventListener('click', () => {
            if (confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
                deletePost(post.id);
            }
        });
    }
}

async function deletePost(id) {
    try {
        const token = getToken();
        if (!token) {
            alert('You must be logged in to delete a post.');
            return;
        }
        const response = await fetch(`/api/posts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
function setupCreatePostModal() {
    const newPostLinkElement = document.getElementById('new-post-link'); // Correctly target the nav link
    const createPostModal = document.getElementById('postFormModal'); // Assuming postFormModal is the correct ID for the create/edit modal
    console.log('setupCreatePostModal: newPostLinkElement', newPostLinkElement);
    console.log('setupCreatePostModal: createPostModal', createPostModal);

    if (!createPostModal) {
        console.error('setupCreatePostModal: postFormModal not found!');
        return;
    }
    const createPostModalCloseBtn = createPostModal.querySelector('.close-button');
    const createPostForm = document.getElementById('postForm'); // Assuming postForm is the correct ID for the form

    if (newPostLinkElement) {
        newPostLinkElement.querySelector('a').addEventListener('click', (e) => { // Attach to <a> tag within <li>
            e.preventDefault(); // Prevent default link behavior
            openPostFormModal(); // Open the general post form modal
        });
    }

    if (createPostForm) { // This refers to postForm
        createPostForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const postId = document.getElementById('postId').value; // Get postId from the hidden input

            const postData = {
                title: document.getElementById('postTitle').value,
                description: document.getElementById('postDescription').value,
                hashtags: document.getElementById('postHashtags').value,
            };
            
            const imageFile = document.getElementById('postImageFile').files[0];
            const removeImage = document.getElementById('removeImageCheckbox') ? document.getElementById('removeImageCheckbox').checked : false;
            const currentImagePath = document.getElementById('currentImagePathInput').value;

            // Handle image path logic for update
            if (postId) { // Only apply this logic if it's an update (postId exists)
                if (removeImage) {
                    postData.imagePath = null; // Explicitly set to null to remove image
                } else if (!imageFile && currentImagePath) {
                    postData.imagePath = currentImagePath; // Keep existing image if no new file and not removed
                }
                // If a new imageFile is provided, the backend will handle it, and imagePath in postData isn't strictly needed here.
                // If no new imageFile, no currentImagePath and not removing, then imagePath remains null/undefined (correct for new posts or no image).
            }

            const formData = new FormData();
            formData.append('post', new Blob([JSON.stringify(postData)], { type: 'application/json' }));
            if (imageFile) {
                formData.append('imageFile', imageFile);
            }

            if (postId) {
                await updatePost(postId, formData);
            } else {
                await createPost(formData);
            }
            createPostModal.style.display = 'none'; // Hide the modal after submit
            fetchPosts(); // Refresh posts
        });
    }
}

function openPostFormModal(post = null) { // This is the function called for both create and edit
    const postFormModal = document.getElementById('postFormModal');
    const postForm = document.getElementById('postForm');
    postForm.reset(); // Clear previous data
    document.getElementById('currentImage').textContent = ''; // Clear current image display

    if (post) {
        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postDescription').value = post.content;
        document.getElementById('postHashtags').value = post.hashtags;
        document.getElementById('currentImagePathInput').value = post.imagePath || ''; // Populate the hidden input

        postFormModal.querySelector('h2').textContent = '게시물 수정';
        if (post.imagePath) {
            document.getElementById('currentImage').innerHTML = `
                <p>현재 이미지:</p>
                <img src="${post.imagePath}" alt="Current Post Image" style="max-width: 100px; height: auto; display: block; margin-top: 5px;">
                <label><input type="checkbox" id="removeImageCheckbox"> 이미지 삭제</label>
            `;
        }
    } else {
        document.getElementById('postId').value = '';
        postFormModal.querySelector('h2').textContent = '새 게시물';
    }
    postFormModal.style.display = 'block';
}

async function createPost(formData) {
    try {
        const token = getToken();
        if (!token) {
            alert('You must be logged in to create a post.');
            return;
        }

        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        alert('게시물이 성공적으로 생성되었습니다.');
    } catch (error) {
        console.error('Error creating post:', error);
        alert('게시물 생성에 실패했습니다: ' + error.message);
    }
}

async function updatePost(id, formData) {
    try {
        const token = getToken();
        if (!token) {
            alert('You must be logged in to update a post.');
            return;
        }
        const response = await fetch(`/api/posts/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        alert('게시물이 성공적으로 수정되었습니다.');
    } catch (error) {
        console.error('Error updating post:', error);
        alert('게시물 수정에 실패했습니다: ' + error.message);
    }
}

// --- Edit Post Modal Logic ---
// This entire section was for a separate editPostModal, but we're now using openPostFormModal
// for both create and edit. So this can be largely removed or commented out.
// For now, I'll ensure it doesn't cause errors by only calling setupEditPostModal if it's explicitly needed.
function setupEditPostModal() {
    const editPostModal = document.getElementById('editPostModal');
    if (!editPostModal) return; // Ensure editPostModal exists

    const editPostModalCloseBtn = editPostModal.querySelector('.close-button');
    const editPostForm = document.getElementById('editPostForm');
    // ... other elements

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

            const postId = document.getElementById('editPostId').value;
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
                postDto.imagePath = document.getElementById('currentImagePath').value;
            }

            postFormData.append('post', new Blob([JSON.stringify(postDto)], { type: 'application/json' }));

            if (imageFile && imageFile.size > 0) {
                postFormData.append('imageFile', imageFile);
            }

            try {
                const token = getToken();
                if (!token) {
                    alert('You must be logged in to update a post.');
                    return;
                }

                const response = await fetch(`/api/posts/${postId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
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
}


function closeEditPostModal() {
    const modal = document.getElementById('editPostModal');
    if (modal) {
        modal.style.display = 'none';
    }
}