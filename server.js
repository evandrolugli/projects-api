const express = require("express")
const mysql = require("mysql2")
const app = express();

app.use(express.json());

// Database configuration
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Qwert@123',
    database: 'project',
    port: 3306
});

// List projects
app.get('/projects', (req, res) => {
    const query = `
        SELECT p.*,
        GROUP_CONCAT(t.name ORDER BY t.name ASC) AS technologies
        FROM projects p
        LEFT JOIN project_technologies pt ON p.id = pt.project_id
        LEFT JOIN technologies t ON pt.technology_id = t.id
        GROUP BY p.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching projects:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }

    res.json(results);
    });
});

// List projects by projectID
app.get('/projects/:id', (req, res) => {
    const projectId = req.params.id;
    const query = `
        SELECT p.*,
        GROUP_CONCAT(t.name ORDER BY t.name ASC) AS technologies
        FROM projects p
        LEFT JOIN project_technologies pt ON p.id = pt.project_id
        LEFT JOIN technologies t ON pt.technology_id = t.id
        WHERE p.id = ?
    `;
    
    db.query(query, [projectId], (err, results) => {
        if (err) {
            console.error('Error fetching projects:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.json(results);
    });
});

// List projects by technology
app.get('/projects/technology/:name', (req, res) => {
    const technology = req.params.name;
    const query = `
        SELECT p.* 
        FROM projects p 
        JOIN project_technologies pt ON p.id = pt.project_id 
        JOIN technologies t ON pt.technology_id = t.id 
        WHERE t.name = ?
    `;

    db.query(query, [technology], (err, results) => {
        if (err) {
            console.error('Error fetching projects:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.json(results);
    });
});

// List all technologies
app.get('/technologies', (req, res) => {
    const query = 'SELECT * FROM technologies ORDER BY id';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching technologies:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.json(results);
    });
});

// Create a new project
app.post('/projects', (req, res) => {
    const { title, description, image, github, demo } = req.body;

    // SQL query to insert a new project
    const insertProjectQuery = 'INSERT INTO projects (title, description, image, github, demo) VALUES (?, ?, ?, ?, ?)';
    db.query(insertProjectQuery, [title, description, image, github, demo], (err, projectResult) => {
        if (err) {
            console.error('Error inserting project:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }

        const projectId = projectResult.insertId;

        // Send response with the created project ID
        res.status(201).json({ message: 'Project created successfully', projectId });
    });
});

// Create a new technology
app.post('/technologies', (req, res) => {
    const { name } = req.body;
    const insertTechQuery = 'INSERT INTO technologies (name) VALUES (?)';
    db.query(insertTechQuery, [name], (err, result) => {
        if (err) {
            console.error('Error inserting technology:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.status(201).json({ message: 'Technology created successfully', technologyId: result.insertId });
    });
});

// Link technologies to project
app.post('/project_technologies', (req, res) => {
    const { projectId, technologies } = req.body;

    if (!projectId || !Array.isArray(technologies)) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    // Insert new technologies (ignore duplicates)
    const technologyNames = technologies.map(tech => [tech]);
    const insertTechQuery = 'INSERT IGNORE INTO technologies (name) VALUES ?';
    db.query(insertTechQuery, [technologyNames], err => {
        if (err) {
            console.error('Error inserting technologies:', err);
            return res.status(500).json({ error: 'Database query error' });
        }

        // Get the IDs of the technologies
        const getTechIdsQuery = 'SELECT id FROM technologies WHERE name IN (?)';
        db.query(getTechIdsQuery, [technologies], (err, techResults) => {
            if (err) {
                console.error('Error fetching technology IDs:', err);
                return res.status(500).json({ error: 'Database query error' });
            }

            // Prepare entries to link technologies to the project
            const projectTechEntries = techResults.map(tech => [projectId, tech.id]);
            const insertProjectTechQuery = 'INSERT INTO project_technologies (project_id, technology_id) VALUES ?';
            db.query(insertProjectTechQuery, [projectTechEntries], err => {
                if (err) {
                    console.error('Error linking project and technologies:', err);
                    return res.status(500).json({ error: 'Database query error' });
                }

                res.status(201).json({ message: 'Project technologies linked successfully' });
            });
        });
    });
});

// Edit a project
app.put('/projects/:id', (req, res) => {
    const projectId = req.params.id;
    const { title, description, image, github, demo } = req.body;
    const updateProjectQuery = 'UPDATE projects SET title = ?, description = ?, image = ?, github = ?, demo = ? WHERE id = ?';
    db.query(updateProjectQuery, [title, description, image, github, demo, projectId], err => {
        if (err) {
            console.error('Error updating project:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.status(200).json({ message: 'Project updated successfully' });
    });
});

// Edit a technology
app.put('/technologies/:id', (req, res) => {
    const technologyId = req.params.id;
    const { name } = req.body;
    const updateTechQuery = 'UPDATE technologies SET name = ? WHERE id = ?';
    db.query(updateTechQuery, [name, technologyId], err => {
        if (err) {
            console.error('Error updating technology:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.status(200).json({ message: 'Technology updated successfully' });
    });
});

// Delete a project
app.delete('/projects/:id', (req, res) => {
    const projectId = req.params.id;
    const deleteProjectQuery = 'DELETE FROM projects WHERE id = ?';
    db.query(deleteProjectQuery, [projectId], err => {
        if (err) {
            console.error('Error deleting project:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.status(200).json({ message: 'Project deleted successfully' });
    });
});

// Delete a technology
app.delete('/technologies/:id', (req, res) => {
    const technologyId = req.params.id;
    const deleteTechQuery = 'DELETE FROM technologies WHERE id = ?';
    db.query(deleteTechQuery, [technologyId], err => {
        if (err) {
            console.error('Error deleting technology:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.status(200).json({ message: 'Technology deleted successfully' });
    });
});

// Edit project technologies
app.put('/project_technologies/:id', (req, res) => {
    const projectId = req.params.id;
    const { technologies } = req.body;

    // First, delete existing technologies for the project
    const deleteProjectTechQuery = 'DELETE FROM project_technologies WHERE project_id = ?';
    db.query(deleteProjectTechQuery, [projectId], err => {
        if (err) {
            console.error('Error deleting project technologies:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }

        // Then, insert new technologies
        const technologyNames = technologies.map(tech => [tech]);
        const insertTechQuery = 'INSERT IGNORE INTO technologies (name) VALUES ?';
        db.query(insertTechQuery, [technologyNames], err => {
            if (err) {
                console.error('Error inserting technologies:', err);
                res.status(500).json({ error: 'Database query error' });
                return;
            }

            const getTechIdsQuery = 'SELECT id FROM technologies WHERE name IN (?)';
            db.query(getTechIdsQuery, [technologies], (err, techResults) => {
                if (err) {
                    console.error('Error fetching technology IDs:', err);
                    res.status(500).json({ error: 'Database query error' });
                    return;
                }

                const projectTechEntries = techResults.map(tech => [projectId, tech.id]);
                const insertProjectTechQuery = 'INSERT INTO project_technologies (project_id, technology_id) VALUES ?';
                db.query(insertProjectTechQuery, [projectTechEntries], err => {
                    if (err) {
                        console.error('Error linking project and technologies:', err);
                        res.status(500).json({ error: 'Database query error' });
                        return;
                    }

                    res.status(200).json({ message: 'Project technologies updated successfully' });
                });
            });
        });
    });
});

const PORT = 3000
app.listen(PORT, ()=> {
    console.log(`Server running on http://localhost:${PORT}`)
})
