package com.example.test.dto;

import java.util.List;

public class CustomPageDto<T> {
    private List<T> content;
    private int totalPages;
    private int number;
    private boolean first;
    private boolean last;

    public CustomPageDto(List<T> content, int totalPages, int number, boolean first, boolean last) {
        this.content = content;
        this.totalPages = totalPages;
        this.number = number;
        this.first = first;
        this.last = last;
    }

    // Getters and Setters
    public List<T> getContent() {
        return content;
    }

    public void setContent(List<T> content) {
        this.content = content;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public int getNumber() {
        return number;
    }

    public void setNumber(int number) {
        this.number = number;
    }

    public boolean isFirst() {
        return first;
    }

    public void setFirst(boolean first) {
        this.first = first;
    }

    public boolean isLast() {
        return last;
    }

    public void setLast(boolean last) {
        this.last = last;
    }
}
