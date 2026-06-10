// js/app.js

let editor; // Global reference to Monaco Editor instance

// Mock initial file contents or load from local storage
let files = JSON.parse(localStorage.getItem('editorFiles')) || {};

let currentFileName = localStorage.getItem('currentFileName') || '';

// Initialize Monaco Editor via RequireJS
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.40.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
    // Create the editor instance
    editor = monaco.editor.create(document.getElementById('monaco-container'), {
        value: files[currentFileName] ? files[currentFileName].content : '',
        language: files[currentFileName] ? files[currentFileName].language : 'text',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
    });

});

// UI Interactions
document.addEventListener('DOMContentLoaded', () => {
    // Restore DOM state if available
    const savedFileTree = localStorage.getItem('fileTreeHTML');
    if (savedFileTree) document.querySelector('.file-tree').innerHTML = savedFileTree;

    const savedTabs = localStorage.getItem('editorTabsHTML');
    if (savedTabs) document.querySelector('.editor-tabs').innerHTML = savedTabs;

    const savedBreadcrumbs = localStorage.getItem('breadcrumbsHTML');
    if (savedBreadcrumbs) document.querySelector('.breadcrumbs').innerHTML = savedBreadcrumbs;

    // Save state on unload
    window.addEventListener('beforeunload', () => {
        if (editor && currentFileName && files[currentFileName]) {
            files[currentFileName].content = editor.getValue();
        }
        localStorage.setItem('editorFiles', JSON.stringify(files));
        localStorage.setItem('currentFileName', currentFileName);
        localStorage.setItem('fileTreeHTML', document.querySelector('.file-tree').innerHTML);
        localStorage.setItem('editorTabsHTML', document.querySelector('.editor-tabs').innerHTML);
        localStorage.setItem('breadcrumbsHTML', document.querySelector('.breadcrumbs').innerHTML);
    });

    // Handle File Tree Clicks using event delegation
    const fileTree = document.querySelector('.file-tree');
    fileTree.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-file-btn');
        if (deleteBtn) {
            e.stopPropagation();
            const fileItem = deleteBtn.closest('.file-item');
            const fileName = fileItem.innerText.trim();

            if (confirm(`Are you sure you want to delete '${fileName}'?`)) {
                delete files[fileName];
                fileItem.remove();

                // If deleted file is currently open, switch to another or clear
                if (currentFileName === fileName) {
                    const remainingFiles = Object.keys(files);
                    if (remainingFiles.length > 0) {
                        openFile(remainingFiles[0]);
                    } else {
                        currentFileName = '';
                        editor.setValue('');
                        const activeTab = document.querySelector('.tab.active');
                        if (activeTab) activeTab.remove();
                        document.querySelector('.breadcrumbs').innerHTML = '';
                    }
                }
            }

            return;
        }

        const renameFileBtn = e.target.closest('.rename-file-btn');
        if (renameFileBtn) {
            e.stopPropagation();
            const fileItem = renameFileBtn.closest('.file-item');
            const oldName = fileItem.innerText.trim();
            const newName = prompt('Nhập tên file mới:', oldName);

            if (newName && newName !== oldName) {
                if (files[newName]) {
                    alert('Tên file đã tồn tại!');
                    return;
                }

                // Cập nhật state
                if (currentFileName === oldName) {
                    files[oldName].content = editor.getValue();
                }
                files[newName] = files[oldName];
                delete files[oldName];

                // Cập nhật lại icon theo đuôi file
                let iconHtml = '<i class="fa-regular fa-file"></i>';
                if (newName.endsWith('.html')) { iconHtml = '<i class="fa-brands fa-html5" style="color: #e34f26;"></i>'; }
                else if (newName.endsWith('.css')) { iconHtml = '<i class="fa-brands fa-css3-alt" style="color: #1572B6;"></i>'; }
                else if (newName.endsWith('.js')) { iconHtml = '<i class="fa-brands fa-square-js" style="color: #F7DF1E;"></i>'; }

                const nameContainer = fileItem.querySelector('.file-item-name');
                if (nameContainer) {
                    nameContainer.innerHTML = `${iconHtml} ${newName}`;
                }

                // Nếu file đang mở
                if (currentFileName === oldName) {
                    currentFileName = newName;
                    const activeTab = document.querySelector('.tab.active');
                    if (activeTab) {
                        activeTab.innerHTML = `${iconHtml} ${newName} <i class="fa-solid fa-xmark close-tab"></i>`;
                    }
                    const breadcrumbText = document.querySelector('.breadcrumbs span:last-child');
                    if (breadcrumbText) breadcrumbText.innerText = newName;
                }
            }
            return;
        }


        const deleteFolderBtn = e.target.closest('.delete-folder-btn');
        if (deleteFolderBtn) {
            e.stopPropagation();
            const folderItem = deleteFolderBtn.closest('.folder-item');
            const folderName = folderItem.querySelector('.folder-item-name').innerText.trim();
            if (confirm(`Are you sure you want to delete folder '${folderName}'?`)) {
                const childrenContainer = folderItem.nextElementSibling;
                if (childrenContainer && childrenContainer.classList.contains('folder-children')) {
                    // Ideally we should delete all files in files state that are in this folder, 
                    // but for simplicity of this static mock we just clear the DOM.
                    childrenContainer.remove();
                }
                folderItem.remove();
            }
            return;
        }

        const renameFolderBtn = e.target.closest('.rename-folder-btn');
        if (renameFolderBtn) {
            e.stopPropagation();
            const folderItem = renameFolderBtn.closest('.folder-item');
            const oldName = folderItem.querySelector('.folder-item-name').innerText.trim();
            const newName = prompt('Nhập tên thư mục mới:', oldName);

            if (newName && newName !== oldName) {
                const nameContainer = folderItem.querySelector('.folder-item-name');
                const icon = nameContainer.querySelector('.fa-folder, .fa-folder-open');
                const chevron = nameContainer.querySelector('.fa-chevron-right, .fa-chevron-down');

                const iconOuterHtml = icon ? icon.outerHTML : '<i class="fa-solid fa-folder" style="color: #dcb67a;"></i>';
                const chevronOuterHtml = chevron ? chevron.outerHTML : '<i class="fa-solid fa-chevron-down" style="font-size:10px;"></i>';

                nameContainer.innerHTML = `\n                    ${chevronOuterHtml}\n                    ${iconOuterHtml} ${newName}\n                `;
            }
            return;
        }

        const createInFolderBtn = e.target.closest('.create-file-in-folder-btn');
        if (createInFolderBtn) {
            e.stopPropagation();
            const folderItem = createInFolderBtn.closest('.folder-item');
            document.querySelectorAll('.file-item, .folder-item').forEach(i => i.classList.remove('active'));
            folderItem.classList.add('active');
            document.getElementById('new-file-btn').click();
            return;
        }

        const createFolderInFolderBtn = e.target.closest('.create-folder-in-folder-btn');
        if (createFolderInFolderBtn) {
            e.stopPropagation();
            const folderItem = createFolderInFolderBtn.closest('.folder-item');
            document.querySelectorAll('.file-item, .folder-item').forEach(i => i.classList.remove('active'));
            folderItem.classList.add('active');
            document.getElementById('new-folder-btn').click();
            return;
        }

        const fileItem = e.target.closest('.file-item');
        if (fileItem) {
            // Remove active from all
            document.querySelectorAll('.file-item, .folder-item').forEach(i => i.classList.remove('active'));
            // Set active to clicked
            fileItem.classList.add('active');

            // Extract filename from text content
            const fileName = fileItem.innerText.trim();
            openFile(fileName);
            return;
        }

        const folderItem = e.target.closest('.folder-item');
        if (folderItem) {
            document.querySelectorAll('.file-item, .folder-item').forEach(i => i.classList.remove('active'));
            folderItem.classList.add('active');
            // Toggle folder children visibility
            const childrenContainer = folderItem.nextElementSibling;
            if (childrenContainer && childrenContainer.classList.contains('folder-children')) {
                const isHidden = childrenContainer.style.display === 'none';
                childrenContainer.style.display = isHidden ? 'flex' : 'none';
                const icon = folderItem.querySelector('.fa-chevron-down, .fa-chevron-right');
                if (icon) {
                    icon.className = isHidden ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right';
                }
            }
        }
    });

    // Handle Create File
    const newFileBtn = document.getElementById('new-file-btn');
    if (newFileBtn) {
        newFileBtn.addEventListener('click', () => {
            const fileName = prompt('Enter new file name:');
            if (!fileName || files[fileName]) return;

            // Determine language and icon
            let language = 'text';
            let iconHtml = '<i class="fa-regular fa-file"></i>';
            if (fileName.endsWith('.html')) { language = 'html'; iconHtml = '<i class="fa-brands fa-html5" style="color: #e34f26;"></i>'; }
            else if (fileName.endsWith('.css')) { language = 'css'; iconHtml = '<i class="fa-brands fa-css3-alt" style="color: #1572B6;"></i>'; }
            else if (fileName.endsWith('.js')) { language = 'javascript'; iconHtml = '<i class="fa-brands fa-square-js" style="color: #F7DF1E;"></i>'; }

            // Add to state
            files[fileName] = { language: language, content: '' };

            // Create element
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item';
            fileDiv.innerHTML = `
                <div class="file-item-name">${iconHtml} ${fileName}</div>
                <div class="file-actions">
                    <i class="fa-solid fa-pen rename-file-btn" title="Đổi tên"></i>
                    <i class="fa-solid fa-trash delete-file-btn" title="Xóa"></i>
                </div>
            `;

            // Append to active folder or root
            const activeFolder = document.querySelector('.folder-item.active');
            if (activeFolder && activeFolder.nextElementSibling && activeFolder.nextElementSibling.classList.contains('folder-children')) {
                activeFolder.nextElementSibling.appendChild(fileDiv);
                activeFolder.nextElementSibling.style.display = 'flex';
                const icon = activeFolder.querySelector('.fa-chevron-right');
                if (icon) icon.className = 'fa-solid fa-chevron-down';
            } else {
                document.querySelector('.file-tree').appendChild(fileDiv);
            }

            // Open the new file
            fileDiv.click();
        });
    }

    // Handle Create Folder
    const newFolderBtn = document.getElementById('new-folder-btn');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', () => {
            const folderName = prompt('Enter new folder name:');
            if (!folderName) return;

            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder-item active';
            folderDiv.innerHTML = `
                <div class="folder-item-name">
                    <i class="fa-solid fa-chevron-down" style="font-size:10px;"></i> 
                    <i class="fa-solid fa-folder" style="color: #dcb67a;"></i> ${folderName}
                </div>
                <div class="folder-actions">
                    <i class="fa-solid fa-file-circle-plus create-file-in-folder-btn" title="New File"></i>
                    <i class="fa-solid fa-folder-plus create-folder-in-folder-btn" title="New Folder"></i>
                    <i class="fa-solid fa-pen rename-folder-btn" title="Rename Folder"></i>
                    <i class="fa-solid fa-trash delete-folder-btn" title="Delete Folder"></i>
                </div>
            `;

            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'folder-children';

            const activeFolder = document.querySelector('.folder-item.active');

            // Remove active from all
            document.querySelectorAll('.file-item, .folder-item').forEach(i => i.classList.remove('active'));
            folderDiv.classList.add('active');

            if (activeFolder && activeFolder.nextElementSibling && activeFolder.nextElementSibling.classList.contains('folder-children')) {
                activeFolder.nextElementSibling.appendChild(folderDiv);
                activeFolder.nextElementSibling.appendChild(childrenDiv);
                activeFolder.nextElementSibling.style.display = 'flex';
                const icon = activeFolder.querySelector('.fa-chevron-right');
                if (icon) icon.className = 'fa-solid fa-chevron-down';
            } else {
                document.querySelector('.file-tree').appendChild(folderDiv);
                document.querySelector('.file-tree').appendChild(childrenDiv);
            }
        });
    }

    // Handle Export File feature
    const exportBtn = document.getElementById('export-file-btn');
    exportBtn.addEventListener('click', () => {
        if (!editor) return;

        // Get current content from editor
        const codeContent = editor.getValue();

        // Create Blob
        const blob = new Blob([codeContent], { type: 'text/plain' });

        // Create download link
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = currentFileName;

        // Trigger download
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    });

    // Handle Export Project ZIP feature
    const exportZipBtn = document.getElementById('export-zip-btn');
    if (exportZipBtn) {
        exportZipBtn.addEventListener('click', () => {
            if (typeof JSZip === 'undefined') {
                alert('JSZip library is not loaded!');
                return;
            }
            // Save current file
            if (editor && currentFileName && files[currentFileName]) {
                files[currentFileName].content = editor.getValue();
            }

            const zip = new JSZip();

            function buildZipFromDOM(container, zipNode) {
                const children = Array.from(container.children);
                for (let i = 0; i < children.length; i++) {
                    const el = children[i];
                    if (el.classList.contains('file-item')) {
                        const name = el.querySelector('.file-item-name').innerText.trim();
                        if (files[name]) {
                            zipNode.file(name, files[name].content);
                        }
                    } else if (el.classList.contains('folder-item')) {
                        const folderName = el.querySelector('.folder-item-name').innerText.trim();
                        const newZipFolder = zipNode.folder(folderName);
                        const nextEl = children[i + 1];
                        if (nextEl && nextEl.classList.contains('folder-children')) {
                            buildZipFromDOM(nextEl, newZipFolder);
                            i++; // skip folder-children
                        }
                    }
                }
            }

            buildZipFromDOM(document.querySelector('.file-tree'), zip);

            zip.generateAsync({ type: 'blob' }).then(function (content) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(content);
                a.download = 'project.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            });
        });
    }

});

// Function to switch active file
function openFile(fileName) {
    if (!files[fileName] || !editor) return;

    // Save current file's content before switching
    if (currentFileName && files[currentFileName]) {
        files[currentFileName].content = editor.getValue();
    }

    // Switch file
    currentFileName = fileName;

    // Update Editor Model
    monaco.editor.setModelLanguage(editor.getModel(), files[fileName].language);
    editor.setValue(files[fileName].content);

    // Update UI elements
    updateBreadcrumbs(fileName);
    updateTab(fileName);
}

// Function to update breadcrumbs
function updateBreadcrumbs(fileName) {
    const breadcrumbs = document.querySelector('.breadcrumbs');
    breadcrumbs.innerHTML = `<span>MY PROJECT</span> <i class="fa-solid fa-chevron-right"></i> <span>${fileName}</span>`;
}

// Function to update Tab UI
function updateTab(fileName) {
    const tab = document.querySelector('.tab.active');
    if (tab) {
        // Icon logic based on extension
        let iconHtml = '<i class="fa-regular fa-file"></i>';
        if (fileName.endsWith('.html')) {
            iconHtml = '<i class="fa-brands fa-html5" style="color: #e34f26;"></i>';
        } else if (fileName.endsWith('.css')) {
            iconHtml = '<i class="fa-brands fa-css3-alt" style="color: #1572B6;"></i>';
        } else if (fileName.endsWith('.js')) {
            iconHtml = '<i class="fa-brands fa-square-js" style="color: #F7DF1E;"></i>';
        }

        tab.innerHTML = `${iconHtml} ${fileName} <i class="fa-solid fa-xmark close-tab"></i>`;
    }
}

