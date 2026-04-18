public interface IProjectService
{
    Task<List<Project>> GetAll();
    Task<Project?> GetById(int id);

    Task<Project> Create(CreateProjectDto dto);
    Task Update(int id, UpdateProjectDto dto);

    Task Delete(int id);
}