using Microsoft.EntityFrameworkCore;

public class ProjectService : IProjectService
{
    private readonly AppDbContext _context;

    public ProjectService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Project>> GetAll()
    {
        return await _context.Projects.ToListAsync();
    }

    public async Task<Project?> GetById(int id)
    {
        return await _context.Projects.FindAsync(id);
    }

    public async Task<Project> Create(CreateProjectDto dto)
    {
        var project = new Project
        {
            Name = dto.Name,
            Description = dto.Description
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        return project;
    }

    public async Task Update(int id, UpdateProjectDto dto)
    {
        var project = await _context.Projects.FindAsync(id);

        if (project == null)
            return;

        project.Name = dto.Name ?? project.Name;
        project.Description = dto.Description ?? project.Description;

        await _context.SaveChangesAsync();
    }

    public async Task Delete(int id)
    {
        var project = await _context.Projects.FindAsync(id);

        if (project == null)
            return;

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();
    }
}