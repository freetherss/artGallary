document.addEventListener('DOMContentLoaded', () => {
    updateNav(); // Call updateNav initially to set navigation state
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const isSignupPage = window.location.pathname.endsWith('signup.html');

    if (isLoginPage) {
        setupLoginForm();
    } else if (isSignupPage) {
        setupSignupForm();
    } else {
        fetchPosts(); // Initial fetch for the first page
        setupModals();
        setupCreatePostModal();
        setupEditPostModal();
        setupPagination(); // Set up event listeners for pagination buttons
    }
});

let currentPage = 0;
let totalPages = 1;
let currentTag = '';

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
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');

        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
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
    if (!signupForm) return;

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
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Sign up failed!' }));
                throw new Error(errorData.message || 'Sign up failed!');
            }

            window.location.href = '/login.html?signupSuccess=true';

        } catch (error) {
            errorEl.textContent = error.message || 'Sign up failed. Please try again.';
            console.error('Signup error:', error);
        }
    });
}

function setupModals() {
    const postFormModal = document.getElementById('postFormModal');
    const closeButtons = document.querySelectorAll('.modal .close-button');

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    if (postFormModal) {
        window.addEventListener('click', (event) => {
            if (event.target === postFormModal) {
                postFormModal.style.display = 'none';
            }
        });
    }
}

async function fetchPosts(page = 0, tag = '') {
    try {
        currentTag = tag; // Store the current tag for pagination
        const url = tag 
            ? `/api/posts?tag=${tag}&page=${page}&size=9` 
            : `/api/posts?page=${page}&size=9`;
        
        const headers = {};
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const pageData = await response.json();
        displayPosts(pageData.content);
        updatePaginationControls(pageData);
    } catch (error) {
        console.error('Error fetching posts:', error);
        document.querySelector('.posts-grid').innerHTML = '<p>Failed to load posts. Please try again later.</p>';
    }
}

function displayPosts(posts) {
    const postsGrid = document.querySelector('.posts-grid');
    postsGrid.innerHTML = '';

    if (!posts || posts.length === 0) {
        postsGrid.innerHTML = '<p>No posts found.</p>';
        return;
    }

    posts.forEach(post => {
        const postItem = document.createElement('div');
        postItem.className = 'post-item';
        postItem.dataset.postId = post.id;
        postItem.innerHTML = `
            <img src="${post.imagePath}" alt="${post.description}">
            <h3>${post.description}</h3>
            <p>${post.hashtags ? post.hashtags.split(',').map(tag => `<span class="hashtag" data-tag="${tag.trim()}">#${tag.trim()}</span>`).join(' ') : ''}</p>
        `;
        postsGrid.appendChild(postItem);
    });

    postsGrid.querySelectorAll('.post-item').forEach(item => {
        item.addEventListener('click', (event) => {
            const postId = event.currentTarget.dataset.postId;
            showPostDetail(postId);
        });
    });

    postsGrid.querySelectorAll('.hashtag').forEach(hashtagSpan => {
        hashtagSpan.addEventListener('click', (event) => {
            event.stopPropagation();
            const tag = event.currentTarget.dataset.tag;
            fetchPosts(0, tag); // Reset to first page when filtering by new tag
        });
    });
}

function setupPagination() {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentPage > 0) {
                fetchPosts(currentPage - 1, currentTag);
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages - 1) {
                fetchPosts(currentPage + 1, currentTag);
            }
        });
    }
}

function updatePaginationControls(pageData) {
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    currentPage = pageData.number;
    totalPages = pageData.totalPages;

    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    }

    if (prevButton) {
        prevButton.disabled = pageData.first;
    }
    
    if (nextButton) {
        nextButton.disabled = pageData.last;
    }
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
        const currentUser = decodedToken.sub;
        const roles = decodedToken.roles || [];

        const isOwner = post.user && post.user.username === currentUser;
        const isAdmin = roles.includes('ROLE_ADMIN');

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

    const editButton = document.getElementById('edit-post-btn');
    if (editButton) {
        editButton.addEventListener('click', () => {
            closePostDetailModal();
            openPostFormModal(post);
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
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        closePostDetailModal();
        fetchPosts(0, currentTag); // Refresh to the first page of the current view
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

function setupCreatePostModal() {
    const newPostLinkElement = document.getElementById('new-post-link');
    const createPostModal = document.getElementById('postFormModal');

    if (!createPostModal) {
        console.error('setupCreatePostModal: postFormModal not found!');
        return;
    }
    const createPostForm = document.getElementById('postForm');

    if (newPostLinkElement) {
        newPostLinkElement.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            openPostFormModal();
        });
    }

    if (createPostForm) {
        createPostForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const postId = document.getElementById('postId').value;

            const postData = {
                title: document.getElementById('postTitle').value,
                description: document.getElementById('postDescription').value,
                hashtags: document.getElementById('postHashtags').value,
            };
            
            const imageFile = document.getElementById('postImageFile').files[0];
            const removeImage = document.getElementById('removeImageCheckbox') ? document.getElementById('removeImageCheckbox').checked : false;
            const currentImagePath = document.getElementById('currentImagePathInput').value;

            if (postId) {
                if (removeImage) {
                    postData.imagePath = null;
                } else if (!imageFile && currentImagePath) {
                    postData.imagePath = currentImagePath;
                }
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
            createPostModal.style.display = 'none';
            fetchPosts(0, currentTag); // Refresh to the first page
        });
    }
}

function openPostFormModal(post = null) {
    const postFormModal = document.getElementById('postFormModal');
    const postForm = document.getElementById('postForm');
    postForm.reset();
    const currentImageDiv = document.getElementById('currentImage');
    if(currentImageDiv) currentImageDiv.innerHTML = '';

    if (post) {
        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postDescription').value = post.description; // Corrected from post.content
        document.getElementById('postHashtags').value = post.hashtags;
        document.getElementById('currentImagePathInput').value = post.imagePath || '';

        postFormModal.querySelector('h2').textContent = '게시물 수정';
        if (post.imagePath && currentImageDiv) {
            currentImageDiv.innerHTML = `
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
            headers: { 'Authorization': `Bearer ${token}` },
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
            headers: { 'Authorization': `Bearer ${token}` },
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

// This function is effectively deprecated as its logic is merged into setupCreatePostModal and openPostFormModal
function setupEditPostModal() {
    // Left empty intentionally, as its functionality is now part of the main post form modal
}

function closeEditPostModal() {
    // This is also deprecated
    const modal = document.getElementById('editPostModal');
    if (modal) {
        modal.style.display = 'none';
    }
}