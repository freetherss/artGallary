The issue with post modification causing images to disappear has been addressed.

Here's how to verify the fix:

1.  **Restart the Spring Boot backend:** Ensure you stop any currently running backend process and restart it to pick up the new changes.
    ```bash
    ./gradlew bootRun
    ```
2.  **Refresh the frontend:** Open or refresh 'TEXT/index.html' in your browser.

Now, please test the post editing functionality:

-   **Edit a post without selecting a new image file:** Change only the description or hashtags. The image associated with the post should remain visible and unchanged.
-   **Edit a post and select a new image file:** The image should be updated correctly.

If you encounter any further issues or have more questions, please let me know!
