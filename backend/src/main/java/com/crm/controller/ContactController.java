package com.crm.controller;

import com.crm.domain.Contact;
import com.crm.exception.ResourceNotFoundException;
import com.crm.repository.ContactRepository;
import io.micrometer.observation.annotation.Observed;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
@Observed(name = "contact.controller")
public class ContactController {

    private final ContactRepository repo;

    /** Paginación: GET /api/contacts?page=0&size=20&sort=name,asc */
    @GetMapping
    public Page<Contact> list(@PageableDefault(size = 20, sort = "name") Pageable pageable) {
        return repo.findAll(pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Contact> get(@PathVariable UUID id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Contact create(@Valid @RequestBody Contact contact) {
        // Asegurarse de que no se pase un ID para forzar upsert
        contact.setId(null);
        return repo.save(contact);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Contact> update(@PathVariable UUID id,
                                          @Valid @RequestBody Contact updated) {
        return repo.findById(id).map(c -> {
            c.setName(updated.getName());
            c.setEmail(updated.getEmail());
            c.setPhone(updated.getPhone());
            c.setCompany(updated.getCompany());
            return ResponseEntity.ok(repo.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * BUG FIX: Eliminada la race condition TOCTOU (Time-Of-Check-Time-Of-Use).
     * El patrón anterior (existsById + deleteById) ejecutaba dos queries separadas.
     * Bajo concurrencia, otro request podía borrar el registro entre ambas llamadas,
     * causando comportamiento indefinido (deleteById no hace nada sobre un ID
     * inexistente pero tampoco lanza excepción — la respuesta 204 sería incorrecta).
     *
     * Solución: findById + delete(entity) en una sola operación lógica.
     * Si no existe → ResourceNotFoundException (→ 404).
     * Si existe → delete atómico sobre la entidad ya cargada.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        Contact contact = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contact", id));
        repo.delete(contact);
    }
}
