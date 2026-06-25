-- ============================================================
-- PROJECT MANAGEMENT TOOL — Schema MySQL 8
-- ============================================================

CREATE DATABASE IF NOT EXISTS project_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE project_management;

-- ============================================================
-- TABLE : users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  firstname   VARCHAR(80)      NOT NULL,
  lastname    VARCHAR(80)      NOT NULL,
  username    VARCHAR(50)      NOT NULL,
  email       VARCHAR(191)     NOT NULL,
  password    VARCHAR(255)     NOT NULL,
  avatar      VARCHAR(255)     DEFAULT NULL,
  role        ENUM('admin','manager','member') NOT NULL DEFAULT 'member',
  is_active   TINYINT(1)       NOT NULL DEFAULT 1,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email    (email),
  UNIQUE KEY uq_users_username (username),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE : projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  title       VARCHAR(191)     NOT NULL,
  description TEXT             DEFAULT NULL,
  owner_id    INT UNSIGNED     NOT NULL,
  status      ENUM('active','archived','completed') NOT NULL DEFAULT 'active',
  color       VARCHAR(7)       NOT NULL DEFAULT '#6C63FF',
  due_date    DATE             DEFAULT NULL,
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_projects_owner  (owner_id),
  INDEX idx_projects_status (status),
  CONSTRAINT fk_projects_owner
    FOREIGN KEY (owner_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE : project_members
-- ============================================================
CREATE TABLE IF NOT EXISTS project_members (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  role       ENUM('admin','manager','member') NOT NULL DEFAULT 'member',
  joined_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_member (project_id, user_id),
  INDEX idx_pm_project (project_id),
  INDEX idx_pm_user    (user_id),
  CONSTRAINT fk_pm_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pm_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE : tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  project_id   INT UNSIGNED   NOT NULL,
  title        VARCHAR(255)   NOT NULL,
  description  TEXT           DEFAULT NULL,
  status       ENUM('backlog','todo','in_progress','review','done') NOT NULL DEFAULT 'backlog',
  priority     ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  assigned_to  INT UNSIGNED   DEFAULT NULL,
  created_by   INT UNSIGNED   NOT NULL,
  due_date     DATE           DEFAULT NULL,
  position     INT UNSIGNED   NOT NULL DEFAULT 0,
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tasks_project  (project_id),
  INDEX idx_tasks_assigned (assigned_to),
  INDEX idx_tasks_status   (status),
  INDEX idx_tasks_priority (priority),
  CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id) REFERENCES projects(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_assigned
    FOREIGN KEY (assigned_to) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE : comments
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id    INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  content    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_comments_task (task_id),
  INDEX idx_comments_user (user_id),
  CONSTRAINT fk_comments_task
    FOREIGN KEY (task_id) REFERENCES tasks(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comments_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE : notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED   NOT NULL,
  type       VARCHAR(60)    NOT NULL,
  message    VARCHAR(500)   NOT NULL,
  entity_id  INT UNSIGNED   DEFAULT NULL,
  entity_type VARCHAR(40)   DEFAULT NULL,
  is_read    TINYINT(1)     NOT NULL DEFAULT 0,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_notif_user    (user_id),
  INDEX idx_notif_is_read (is_read),
  CONSTRAINT fk_notif_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE : activities
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   INT UNSIGNED DEFAULT NULL,
  user_id      INT UNSIGNED NOT NULL,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(40)  NOT NULL,
  entity_id    INT UNSIGNED DEFAULT NULL,
  entity_title VARCHAR(255) DEFAULT NULL,
  meta         JSON         DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_activity_project (project_id),
  INDEX idx_activity_user    (user_id),
  CONSTRAINT fk_activity_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE : attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  task_id     INT UNSIGNED  NOT NULL,
  user_id     INT UNSIGNED  NOT NULL,
  filename    VARCHAR(255)  NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type   VARCHAR(120)  NOT NULL,
  size        INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_attach_task (task_id),
  CONSTRAINT fk_attach_task
    FOREIGN KEY (task_id) REFERENCES tasks(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attach_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
